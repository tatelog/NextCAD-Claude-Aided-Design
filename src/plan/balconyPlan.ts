import polygonClipping from 'polygon-clipping'
import type {AutoPlan} from './autoPlan'
import type {CorridorLayout,Rect} from './candidateCells'
import {corridorForCell} from './planCorridors'
import {placeUnitPlan} from './unitPlan39'
import {cellInsideOutline} from './units'
type Point={x:number;y:number}
export interface BalconyRect extends Rect {unitId:string;side:'左'|'右';depthMm:number;access?:{x:number;y0:number;y1:number}}
/** 計画上の初期値。法定寸法ではない。外形はバルコニー先端を含む配置範囲。 */
export const DEFAULT_BALCONY_DEPTH=1600
export function balconyReservation(width:number,corridor:number,layout:CorridorLayout,depth:number){
 if(![width,corridor,depth].every(Number.isFinite)||width<=0||corridor<=0||depth<=0)throw Error('バルコニー奥行・外形幅・廊下幅を正の数で指定してください')
 const sides=layout==='片廊下'?1:2,innerWidth=width-depth*sides
 const unitDepth=(innerWidth-corridor*(layout==='ツイン'?3:1))/(layout==='片廊下'?1:2)
 if(unitDepth<=0)throw Error('バルコニーと廊下を確保すると住戸帯が残りません。外形幅を広げてください')
 return {innerWidth,unitDepth,offset:depth}
}
export function indoorOutlines(outlines:readonly (readonly Point[])[],width:number,depth:number,layout:CorridorLayout){
 const right=width-(layout==='片廊下'?0:depth)
 return outlines.map(poly=>{
  if(poly.length<3)return []
  const ys=poly.map(p=>p.y),lo=Math.min(...ys)-1,hi=Math.max(...ys)+1
  const clipped=polygonClipping.intersection([poly.map(p=>[p.x,p.y] as [number,number])],[[[depth,lo],[right,lo],[right,hi],[depth,hi],[depth,lo]]])
  if(clipped.length!==1||clipped[0]!.length!==1)throw Error('バルコニー帯を除くと室内外形が分離するため、この形状の配置は未対応です')
  return clipped[0]![0]!.slice(0,-1).map(([x,y])=>({x:x-depth,y}))
 })
}
/** 室内座標を外形座標へ戻す。住戸詳細のローカル座標は動かさない。 */
export function attachBalconies(plan:AutoPlan,outline:readonly Point[],width:number,depth:number):AutoPlan{
 const rect=<T extends Rect>(r:T):T=>({...r,x0:r.x0+depth,x1:r.x1+depth})
 const point=(p:Point)=>({...p,x:p.x+depth})
 const p:AutoPlan={...plan,widthMm:width,balconyDepthMm:depth,balconyEnvelope:[...outline],buildingOutline:plan.buildingOutline?.map(point),
  corridor:rect(plan.corridor),corridors:plan.corridors?.map(rect),bridges:plan.bridges?.map(rect),voids:plan.voids?.map(rect),cells:plan.cells.map(rect),rooms:plan.rooms.map(rect),cores:plan.cores.map(rect),shaftRects:plan.shaftRects.map(rect),
  circulation:plan.circulation?{...plan.circulation,lobby:rect(plan.circulation.lobby),liftShafts:plan.circulation.liftShafts.map(rect),routes:plan.circulation.routes.map(r=>r.map(point)),elevatorRoutes:plan.circulation.elevatorRoutes?.map(r=>r.map(point))}:undefined}
 p.balconies=p.cells.map(c=>{
  const corridor=corridorForCell(p,c),left=c.x1<=corridor.x0+1
  const b:BalconyRect={id:`balcony-${c.id}`,unitId:c.id,side:left?'左':'右',depthMm:depth,x0:left?c.x0-depth:c.x1,x1:left?c.x0:c.x1+depth,y0:c.y0,y1:c.y1}
  if(!cellInsideOutline(b,outline))throw Error(`${c.id}のバルコニーが外形からはみ出します。外形・住戸配置を調整してください`)
  const detail=placeUnitPlan(p.unitTypeIdsByCell?.[c.id]??'',p.unitPlanVariants?.[c.id]??'A',c,corridor,p.unitPlanOverrides?.[c.id]).plan
  const room=detail?.rooms.filter(r=>r.kind==='居室'&&Math.abs(r.y+r.h-detail.envelope.D)<1).sort((a,z)=>Number(z.name.includes('LDK'))-Number(a.name.includes('LDK'))||z.w-a.w)[0]
  if(room){const center=room.x+room.w/2,w=Math.min(1800,room.w*.5),y=left?c.y0+center:c.y1-center;b.access={x:left?c.x0:c.x1,y0:y-w/2,y1:y+w/2}}
  return b
 })
 const overlap=(a:Rect,b:Rect)=>Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0)>1&&Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0)>1
 for(const b of p.balconies){if([...p.cells,...p.cores,...(p.corridors??[p.corridor]),...(p.bridges??[]),...p.balconies.filter(o=>o.id!==b.id)].some(o=>overlap(b,o)))throw Error(`${b.unitId}のバルコニーと住戸・共用部が重なります。配置を調整してください`)}
 return p
}
/** 各戸の外側と端部。接する隣戸間は手すりでなく隔て板として扱う。 */
export function balconyRailSegments(b:BalconyRect,all:readonly BalconyRect[]){
 const x=b.side==='左'?b.x0:b.x1
 const segments=[[{x,y:b.y0},{x,y:b.y1}]]
 for(const y of [b.y0,b.y1]){
  let intervals=[[b.x0,b.x1]]
  for(const other of all.filter(o=>o.id!==b.id&&(Math.abs(o.y0-y)<1||Math.abs(o.y1-y)<1))){intervals=intervals.flatMap(([lo,hi])=>other.x1<=lo!||other.x0>=hi!?[[lo!,hi!]]:[[lo!,Math.min(hi!,other.x0)],[Math.max(lo!,other.x1),hi!]].filter(([a,z])=>z!>a!))}
  for(const [lo,hi] of intervals)segments.push([{x:lo!,y},{x:hi!,y}])
 }
 return segments
}
