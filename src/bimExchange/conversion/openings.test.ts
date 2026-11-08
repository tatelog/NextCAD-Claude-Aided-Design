import { it, expect } from 'vitest'
import { IfcAPI, IFCOPENINGELEMENT, IFCRELVOIDSELEMENT, IFCWALL } from 'web-ifc'
import { intermediateToScene, intermediateToIfc } from './index'
import type { Element, IntermediateModel } from './types'
const rect=(x:number,y:number,w:number,h:number)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}]
const wall:Element={id:'wall',kind:'wall',storeyId:'2',geometry:{type:'extrudedPolygon',outer:rect(0,0,4000,200),holes:[],zMm:3000,heightMm:3000},source:{elementIds:['wall-source'],origin:'plan'},status:'confirmed'}
const opening=():Element & {hostElementId:string}=>({...wall,id:'window',kind:'opening',hostElementId:'wall',geometry:{type:'extrudedPolygon',outer:rect(1000,-50,1000,300),holes:[],zMm:4000,heightMm:1000},status:'estimated'})
const model=(elements:Element[]):IntermediateModel=>({schemaVersion:'bim-intermediate/1',units:'mm',coordinateSystem:'right-handed-z-up',storeys:[{id:'2',name:'2F',elevationMm:3000,heightMm:3000},{id:'3',name:'3F',elevationMm:6000,heightMm:3000}],elements,issues:[]})
function volume(v:number[],ix:number[]){let sum=0;for(let i=0;i<ix.length;i+=3){const a=ix[i]!*3,b=ix[i+1]!*3,c=ix[i+2]!*3;sum+=(v[a]!*(v[b+1]!*v[c+2]!-v[b+2]!*v[c+1]!)+v[a+1]!*(v[b+2]!*v[c]!-v[b]!*v[c+2]!)+v[a+2]!*(v[b]!*v[c+1]!-v[b+1]!*v[c]!))/6}return sum}
it('親壁の窓領域を実際に除去し、元IDと絶対高さを維持する',()=>{
 const input=model([opening(),wall]),before=JSON.stringify(input),s=intermediateToScene(input)
 expect(s.issues).toEqual([]);expect(s.meshes.every(m=>m.elementId==='wall')).toBe(true);expect(s.meshes[0]!.appliedOpenings?.[0]?.status).toBe('estimated')
 expect(s.meshes.reduce((v,m)=>v+volume(m.vertices,m.indices),0)).toBeCloseTo(2200000000,0)
 for(const m of s.meshes)for(let i=0;i<m.indices.length;i+=3){const ps=m.indices.slice(i,i+3).map(n=>m.vertices.slice(n*3,n*3+3));const x=ps.reduce((a,p)=>a+p[0]!,0)/3,z=ps.reduce((a,p)=>a+p[2]!,0)/3;expect(x>1000&&x<2000&&z>4000&&z<5000).toBe(false)}
 expect(JSON.stringify(input)).toBe(before)
})
it('重なる開口を重複控除せずドアを壁下端から除去する',()=>{
 const a=opening(),b=opening();a.geometry!.zMm=3000;a.geometry!.heightMm=2000;b.id='overlap';b.geometry!.zMm=3000;b.geometry!.heightMm=2000;b.geometry!.outer=rect(1500,-50,1000,300)
 const s=intermediateToScene(model([wall,a,b]));expect(s.issues).toEqual([]);expect(s.meshes.reduce((v,m)=>v+volume(m.vertices,m.indices),0)).toBeCloseTo(1800000000,0)
})
it('親不明・別階・非壁・無交差・不正形状の開口を明示して適用しない',()=>{
 const list=[{...opening(),id:'unknown',hostElementId:'none'},{...opening(),id:'floor',storeyId:'3'},{...opening(),id:'kind',hostElementId:'slab'},{...opening(),id:'outside',geometry:{...opening().geometry!,outer:rect(8000,0,1000,200)}},{...opening(),id:'bad',geometry:{...opening().geometry!,heightMm:-1}}]
 for(const convert of [intermediateToScene,intermediateToIfc]){const r=convert(model([wall,{...wall,id:'slab',kind:'slab'},...list]));expect(new Set(r.issues.map(i=>i.elementId))).toEqual(new Set(list.map(e=>e.id)))}
})
it.each(['IFC4','IFC2X3'] as const)('%sの親子関係と独立パーサーでの壁切欠き体積を確認する',async schema=>{
 const result=intermediateToIfc(model([opening(),wall]),schema);expect(result.issues).toEqual([])
 const api=new IfcAPI();await api.Init();const id=api.OpenModel(new TextEncoder().encode(result.ifcText))
 try{const walls=api.GetLineIDsWithType(id,IFCWALL),openings=api.GetLineIDsWithType(id,IFCOPENINGELEMENT),rels=api.GetLineIDsWithType(id,IFCRELVOIDSELEMENT);expect(openings.size()).toBe(1);expect(rels.size()).toBe(1)
 const rel=api.GetLine(id,rels.get(0));expect(rel.RelatingBuildingElement.value).toBe(walls.get(0));expect(rel.RelatedOpeningElement.value).toBe(openings.get(0))
 const host=api.GetLine(id,walls.get(0)),op=api.GetLine(id,openings.get(0));expect(api.GetLine(id,op.ObjectPlacement.value).PlacementRelTo.value).toBe(host.ObjectPlacement.value);if(schema==='IFC4')expect(op.PredefinedType.value).toBe('NOTDEFINED')
 const mesh=api.GetFlatMesh(id,walls.get(0));let total=0;for(let j=0;j<mesh.geometries.size();j++){const placed=mesh.geometries.get(j),g=api.GetGeometry(id,placed.geometryExpressID),raw=api.GetVertexArray(g.GetVertexData(),g.GetVertexDataSize()),ix=Array.from(api.GetIndexArray(g.GetIndexData(),g.GetIndexDataSize())),v:number[]=[];for(let i=0;i<raw.length;i+=6)v.push(raw[i]!,raw[i+1]!,raw[i+2]!);const t=placed.flatTransformation,d=t[0]!*(t[5]!*t[10]!-t[6]!*t[9]!)-t[4]!*(t[1]!*t[10]!-t[2]!*t[9]!)+t[8]!*(t[1]!*t[6]!-t[2]!*t[5]!);total+=Math.abs(volume(v,ix)*d);g.delete()}expect(total).toBeCloseTo(2.2,4)
 }finally{api.CloseModel(id);api.Dispose()}
})


