import { cutBands } from './openings'
import { ShapeUtils, Vector2 } from 'three'
import type { IntermediateModel, MeshScene } from './types'
import { prepare } from './validation'
export function intermediateToScene(model:IntermediateModel):MeshScene {
 const {elements,issues}=prepare(model)
 const meshes=elements.filter(e=>e.kind!=='opening').flatMap(e=>cutBands(e.geometry!,elements.filter(o=>o.kind==='opening'&&o.hostElementId===e.id).map(o=>o.geometry!)).map(g=>{
  const rings=[g.outer,...g.holes],points=rings.flat(),n=points.length
  const vertices=[...points.flatMap(p=>[p.x,p.y,g.zMm]),...points.flatMap(p=>[p.x,p.y,g.zMm+g.heightMm])]
  const triangles=ShapeUtils.triangulateShape(g.outer.map(p=>new Vector2(p.x,p.y)),g.holes.map(h=>h.map(p=>new Vector2(p.x,p.y))))
  const indices:number[]=[]
  for(const face of triangles){let [a,b,c]=face as [number,number,number];const p=points[a]!,q=points[b]!,r=points[c]!;if((q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x)<0)[b,c]=[c,b];indices.push(a,c,b,a+n,b+n,c+n)}
  let offset=0;for(const ring of rings){for(let i=0;i<ring.length;i++){const a=offset+i,b=offset+(i+1)%ring.length;indices.push(a,b,b+n,a,b+n,a+n)}offset+=ring.length}
  return {appliedOpenings:elements.filter(o=>o.kind==='opening'&&o.hostElementId===e.id).map(o=>({id:o.id,source:o.source,status:o.status})),elementId:e.id,kind:e.kind,storeyId:e.storeyId,source:e.source,status:e.status,vertices,indices}
 }))
 return {schemaVersion:'bim-mesh-scene/1',units:'mm',coordinateSystem:'right-handed-z-up',storeys:model.storeys.map(s=>({...s})),meshes,issues}
}


