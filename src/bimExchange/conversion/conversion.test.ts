import { describe, it, expect } from 'vitest'
import { IfcAPI, IFCBUILDINGSTOREY, IFCSLAB, IFCSIUNIT, IFCPROPERTYSINGLEVALUE, IFCWALL, IFCBEAM, IFCCOLUMN } from 'web-ifc'
import { intermediateToIfc, intermediateToScene } from './index'
import type { IntermediateModel, Element } from './types'
const square = (a: number, b: number) => [{x:a,y:a},{x:b,y:a},{x:b,y:b},{x:a,y:b}]
const element = (id = 'slab-2'): Element => ({id,kind:'slab',storeyId:'2F',geometry:{type:'extrudedPolygon',outer:square(0,4000),holes:[square(1000,2000)],zMm:3200,heightMm:200},source:{elementIds:['元床-1'],origin:'estimate'},status:'estimated'})
const model = (elements: Element[] = [element()]): IntermediateModel => ({schemaVersion:'bim-intermediate/1',units:'mm',coordinateSystem:'right-handed-z-up',storeys:[{id:'1F',name:'1階',elevationMm:0,heightMm:3000},{id:'2F',name:'2階',elevationMm:3000,heightMm:3000}],elements,issues:[]})
function volume(vertices: number[], indices: number[]) {
 let v=0
 for(let i=0;i<indices.length;i+=3){const a=indices[i]!*3,b=indices[i+1]!*3,c=indices[i+2]!*3;v+=(vertices[a]!*(vertices[b+1]!*vertices[c+2]!-vertices[b+2]!*vertices[c+1]!)+vertices[a+1]!*(vertices[b+2]!*vertices[c]!-vertices[b]!*vertices[c+2]!)+vertices[a+2]!*(vertices[b]!*vertices[c+1]!-vertices[b+1]!*vertices[c]!))/6}
 return v
}
describe('中間モデル独立変換',()=>{
 it('穴を塞がず絶対Z・mm・元ID・推定状態を保持し入力を変更しない',()=>{
  const input=model(), before=JSON.stringify(input),scene=intermediateToScene(input),m=scene.meshes[0]!
  expect(scene.units).toBe('mm'); expect(scene.coordinateSystem).toBe('right-handed-z-up')
  expect(m.elementId).toBe('slab-2');expect(m.source.elementIds).toEqual(['元床-1']);expect(m.status).toBe('estimated')
  expect(Math.min(...m.vertices.filter((_,i)=>i%3===2))).toBe(3200);expect(Math.max(...m.vertices.filter((_,i)=>i%3===2))).toBe(3400)
  expect(volume(m.vertices,m.indices)).toBeCloseTo(3000000000,0)
  const edges=new Map<string,number>();for(let i=0;i<m.indices.length;i+=3)for(let j=0;j<3;j++){const a=m.indices[i+j]!,b=m.indices[i+(j+1)%3]!,key=[a,b].sort((x,y)=>x-y).join(':');edges.set(key,(edges.get(key)??0)+1)}
  expect([...edges.values()].every(n=>n===2)).toBe(true)
  expect(JSON.stringify(input)).toBe(before);expect(()=>JSON.stringify(scene)).not.toThrow()
 })
 it('凹形状と逆巻きの輪郭でも正の体積を返す',()=>{
  const e=element();e.geometry!.outer=[{x:0,y:0},{x:3000,y:0},{x:3000,y:1000},{x:1000,y:1000},{x:1000,y:3000},{x:0,y:3000}].reverse();e.geometry!.holes=[]
  const m=intermediateToScene(model([e])).meshes[0]!;expect(volume(m.vertices,m.indices)).toBeCloseTo(1000000000,0)
 })
 it('未解決・開口・未対応を出力せず理由を残す',()=>{
  const list=['opening','space','stair','other'].map((kind,i)=>({...element(String(i)),kind} as Element));list.push({...element('null'),geometry:null},{...element('unresolved'),status:'unresolved'})
  for(const convert of [intermediateToScene,intermediateToIfc]){const result=convert(model(list));expect(new Set(result.issues.map(i=>i.elementId))).toEqual(new Set(list.map(e=>e.id)))}
  expect(intermediateToScene(model(list)).meshes).toHaveLength(0);expect(intermediateToIfc(model(list)).ifcText).not.toContain('IFCSLAB(')
 })
 it('外部の穴・交差輪郭・接触穴・階不明を拒否する',()=>{
  const bad=element('outside');bad.geometry!.holes=[square(5000,6000)]
  const cross=element('cross');cross.geometry!.outer=[{x:0,y:0},{x:4000,y:4000},{x:0,y:4000},{x:4000,y:0}]
  const touch=element('touch');touch.geometry!.holes=[square(0,1000)]
  const nested=element('nested');nested.geometry!.holes=[square(1000,3000),square(1500,2000)]
  const elements=[bad,cross,touch,nested,{...element('floor'),storeyId:'missing'}]
  expect(intermediateToScene(model(elements)).meshes).toHaveLength(0)
  expect(intermediateToIfc(model(elements)).issues.filter(i=>i.severity==='error')).toHaveLength(elements.length)
 })
 it('一直線上の中間頂点を含む断面も閉じたmeshにする',()=>{
  const e=element();e.geometry!.holes=[];e.geometry!.outer=[{x:0,y:0},{x:2000,y:0},{x:4000,y:0},{x:4000,y:4000},{x:0,y:4000}]
  const m=intermediateToScene(model([e])).meshes[0]!,edges=new Map<string,number>()
  for(let i=0;i<m.indices.length;i+=3)for(let j=0;j<3;j++){const key=[m.indices[i+j]!,m.indices[i+(j+1)%3]!].sort((a,b)=>a-b).join(':');edges.set(key,(edges.get(key)??0)+1)}
  expect([...edges.values()].every(n=>n===2)).toBe(true)
 })
 it('全体契約・重複IDの不正を拒否する',()=>{
  for(const convert of [intermediateToScene,intermediateToIfc]){expect(()=>convert({...model(),units:'m'} as unknown as IntermediateModel)).toThrow();expect(()=>convert(model([element(),element()]))).toThrow()}
 })
 it.each(['IFC4','IFC2X3'] as const)('%sを独立パーサーで読み単位・階・部材・元ID・穴の体積を保持する',async schema=>{
  const api=new IfcAPI();await api.Init();const {ifcText,issues}=intermediateToIfc(model(),schema);expect(issues).toEqual([])
  const id=api.OpenModel(new TextEncoder().encode(ifcText));expect(id).toBeGreaterThanOrEqual(0)
  try {
   expect(api.GetLineIDsWithType(id,IFCBUILDINGSTOREY).size()).toBe(2);expect(api.GetLineIDsWithType(id,IFCSLAB).size()).toBe(1)
   const units=api.GetLineIDsWithType(id,IFCSIUNIT);expect(api.GetLine(id,units.get(0)).Prefix.value).toBe('MILLI')
   const props=api.GetLineIDsWithType(id,IFCPROPERTYSINGLEVALUE);const values=Array.from({length:props.size()},(_,i)=>api.GetLine(id,props.get(i)).NominalValue.value)
   expect(values).toContain('estimated');expect(values).toContain('slab-2');expect(values).toContain('["元床-1"]')
   const mesh=api.GetFlatMesh(id,api.GetLineIDsWithType(id,IFCSLAB).get(0));expect(mesh.geometries.size()).toBeGreaterThan(0)
   const placed=mesh.geometries.get(0),geom=api.GetGeometry(id,placed.geometryExpressID),raw=api.GetVertexArray(geom.GetVertexData(),geom.GetVertexDataSize()),indices=Array.from(api.GetIndexArray(geom.GetIndexData(),geom.GetIndexDataSize()))
   const vertices:number[]=[];for(let i=0;i<raw.length;i+=6)vertices.push(raw[i]!,raw[i+1]!,raw[i+2]!)
   const t=placed.flatTransformation,det=t[0]!*(t[5]!*t[10]!-t[6]!*t[9]!)-t[4]!*(t[1]!*t[10]!-t[2]!*t[9]!)+t[8]!*(t[1]!*t[6]!-t[2]!*t[5]!)
   expect(Math.abs(volume(vertices,indices)*det)).toBeCloseTo(3,4)
   const world:number[]=[];for(let i=0;i<vertices.length;i+=3)world.push(t[1]!*vertices[i]!+t[5]!*vertices[i+1]!+t[9]!*vertices[i+2]!+t[13]!)
   expect(Math.min(...world)).toBeCloseTo(3.2,4);expect(Math.max(...world)).toBeCloseTo(3.4,4)
   geom.delete()
  } finally {api.CloseModel(id);api.Dispose()}
 })
 it('対応部材を実際のIFCクラスで出力する',async()=>{
  const elements=['wall','column','beam','slab','balcony'].map((kind,i)=>({...element(String(i)),kind} as Element))
  const api=new IfcAPI();await api.Init();const id=api.OpenModel(new TextEncoder().encode(intermediateToIfc(model(elements)).ifcText))
  try {for(const type of [IFCWALL,IFCCOLUMN,IFCBEAM])expect(api.GetLineIDsWithType(id,type).size()).toBe(1);expect(api.GetLineIDsWithType(id,IFCSLAB).size()).toBe(2)}finally{api.CloseModel(id);api.Dispose()}
 })
})


