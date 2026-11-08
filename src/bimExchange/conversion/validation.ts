import { overlaps } from './openings'
import type { Element, IntermediateModel, Issue, Point, ExtrudedPolygon } from './types'
const epsilon = 1e-7
const cross = (a:Point,b:Point,c:Point) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
export const area = (p:Point[]) => p.reduce((s,a,i)=>{const b=p[(i+1)%p.length]!;return s+a.x*b.y-b.x*a.y},0)/2
function on(a:Point,b:Point,p:Point) { return Math.abs(cross(a,b,p))<=epsilon && p.x>=Math.min(a.x,b.x)-epsilon && p.x<=Math.max(a.x,b.x)+epsilon && p.y>=Math.min(a.y,b.y)-epsilon && p.y<=Math.max(a.y,b.y)+epsilon }
function intersects(a:Point,b:Point,c:Point,d:Point) {const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);return ((x>epsilon&&y< -epsilon||x< -epsilon&&y>epsilon)&&(z>epsilon&&w< -epsilon||z< -epsilon&&w>epsilon))||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b)}
function inside(p:Point,ring:Point[]) {let v=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i]!,b=ring[j]!;if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)v=!v}return v}
function touch(a:Point[],b:Point[]) {return a.some((p,i)=>b.some((q,j)=>intersects(p,a[(i+1)%a.length]!,q,b[(j+1)%b.length]!)))}
function ringError(r:Point[]):boolean {
 if(!Array.isArray(r)||r.length<3||r.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))||Math.abs(area(r))<=epsilon)return true
 for(let i=0;i<r.length;i++){
  const next=(i+1)%r.length;if(Math.hypot(r[i]!.x-r[next]!.x,r[i]!.y-r[next]!.y)<=epsilon)return true
  // 隣接辺の折返し・重複も拒否する。
  const prev=r[(i+r.length-1)%r.length]!;if(Math.abs(cross(prev,r[i]!,r[next]!))<=epsilon&&((prev.x-r[i]!.x)*(r[next]!.x-r[i]!.x)+(prev.y-r[i]!.y)*(r[next]!.y-r[i]!.y))>0)return true
  for(let j=i+1;j<r.length;j++){if(j===next||(j+1)%r.length===i)continue;if(intersects(r[i]!,r[next]!,r[j]!,r[(j+1)%r.length]!))return true}
 }
 return false
}
function geometryError(g:ExtrudedPolygon) {
 if(g.type!=='extrudedPolygon'||!Number.isFinite(g.zMm)||!Number.isFinite(g.heightMm)||g.heightMm<=0||!Number.isFinite(g.zMm+g.heightMm)||!Array.isArray(g.holes)||ringError(g.outer)||g.holes.some(ringError))return true
 for(let i=0;i<g.holes.length;i++){const h=g.holes[i]!;if(touch(g.outer,h)||!inside(h[0]!,g.outer))return true;for(let j=0;j<i;j++)if(touch(h,g.holes[j]!)||inside(h[0]!,g.holes[j]!)||inside(g.holes[j]![0]!,h))return true}
 return false
}
export function prepare(model:IntermediateModel):{elements:Element[];issues:Issue[]} {
 if(!model||model.schemaVersion!=='bim-intermediate/1'||model.units!=='mm'||model.coordinateSystem!=='right-handed-z-up'||!Array.isArray(model.storeys)||!Array.isArray(model.elements)||!Array.isArray(model.issues))throw new Error('中間モデルの共通契約が不正です')
 const ids=new Set<string>();for(const s of model.storeys){if(!s||typeof s.id!=='string'||!s.id||ids.has(s.id)||typeof s.name!=='string'||!Number.isFinite(s.elevationMm)||!Number.isFinite(s.heightMm)||s.heightMm<=0)throw new Error('階の定義またはIDが不正です');ids.add(s.id)}
 const seen=new Set<string>();for(const e of model.elements){if(!e||typeof e.id!=='string'||!e.id||seen.has(e.id))throw new Error('要素IDが不正または重複しています');seen.add(e.id)}
 const issues:Issue[]=model.issues.map(i=>({...i})),elements:Element[]=[]
 for(const e of model.elements){
  const fail=(code:string,message:string,severity:Issue['severity']='error')=>issues.push({code,severity,elementId:e.id,message})
  if(!ids.has(e.storeyId)){fail('UNKNOWN_STOREY','参照する階がありません');continue}
  if(!['confirmed','estimated','unresolved'].includes(e.status)||!e.source||!Array.isArray(e.source.elementIds)||e.source.elementIds.some(s=>typeof s!=='string')||!['plan','user','estimate'].includes(e.source.origin)||(e.source.note!==undefined&&typeof e.source.note!=='string')){fail('INVALID_METADATA','状態または元データ情報が不正です');continue}
  if(e.status==='unresolved'||e.geometry===null){fail('UNRESOLVED_GEOMETRY','未解決の要素は出力しません','warning');continue}
  if(!['wall','column','beam','slab','balcony','opening'].includes(e.kind)){fail('UNSUPPORTED_KIND',`未対応の要素種別です: ${e.kind}`,'warning');continue}
  if(!e.geometry||geometryError(e.geometry)){fail('INVALID_GEOMETRY','断面・穴・押出し高さが不正です（交差、接触、包含関係も確認対象）');continue}
  const ring=(r:Point[],ccw:boolean)=>{const result=r.map(p=>({...p}));return (area(result)>0)===ccw?result:result.reverse()}
  elements.push({...e,source:{...e.source,elementIds:[...e.source.elementIds]},geometry:{...e.geometry,outer:ring(e.geometry.outer,true),holes:e.geometry.holes.map(h=>ring(h,false))}})
 }
 const accepted=elements.filter(e=>{
  if(e.kind!=='opening')return true
  const host=elements.find(h=>h.id===e.hostElementId&&h.kind==='wall')
  let code='',message=''
  if(!e.hostElementId){code='OPENING_HOST_UNSPECIFIED';message='開口の親壁IDがありません'}
  else if(!host){code='OPENING_HOST_INVALID';message='親壁が存在しない、壁以外、または変換可能な形状がありません'}
  else if(host.storeyId!==e.storeyId){code='OPENING_STOREY_MISMATCH';message='開口と親壁の階が一致しません'}
  else if(!overlaps(host.geometry!,e.geometry!)){code='OPENING_NO_INTERSECTION';message='開口と親壁に体積の重なりがありません'}
  if(code){issues.push({code,severity:'error',elementId:e.id,message});return false}
  return true
 })
 return {elements:accepted,issues}
}

