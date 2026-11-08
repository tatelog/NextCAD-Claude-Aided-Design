import {cellInsideOutline} from './units'
import {shaftContinuityIssues} from './shaftContinuity'
import type {AutoPlan} from './autoPlan'
import {placeUnitPlan,type UnitPlan39} from './unitPlan39'
import {corridorForCell} from './planCorridors'
import {placeFurniture,doorReserve} from './furniturePlacement'
import {intersects} from './partitionConstraints'
import {validateUnitLayout} from './reshapeUnit'
import {applyUnitPlans} from './applyUnitPlans'
const half=300
const columnBox=(c:{x:number;y:number})=>({x:c.x-half,y:c.y-half,w:2*half,h:2*half})
/** 水回りの矩形を固定し、居室同士の共通壁とそこに付く建具を一緒に調整。 */
function* partitionCandidates(source:UnitPlan39):Generator<UnitPlan39>{
 yield structuredClone(source)
 for(let a=0;a<source.rooms.length;a++)for(let b=a+1;b<source.rooms.length;b++){
  const r=source.rooms[a]!,s=source.rooms[b]!
  if(r.kind!=='居室'||s.kind!=='居室')continue
  for(const axis of ['x','y'] as const){
   const size=axis==='x'?'w':'h',cross=axis==='x'?'y':'x',extent=axis==='x'?'h':'w'
   if(Math.abs(r[cross]-s[cross])>1||Math.abs(r[extent]-s[extent])>1)continue
   const lo=r[axis]<s[axis]?a:b,hi=lo===a?b:a,first=source.rooms[lo]!,last=source.rooms[hi]!
   const wall=last[axis]
   if(Math.abs(first[axis]+first[size]-wall)>1)continue
   for(const delta of [100,-100,200,-200,300,-300,400,-400,600,-600]){
    const p=structuredClone(source),u=p.rooms[lo]!,v=p.rooms[hi]!
    u[size]+=delta;v[axis]+=delta;v[size]-=delta
    if(Math.min(u[size],v[size])<1800)continue
    u.area_m2=u.w*u.h/1e6;v.area_m2=v.w*v.h/1e6
    for(const d of p.doors)if(d.position.orientation===(axis==='x'?'v':'h')&&Math.abs(d.position.coord-wall)<1&&d.position.start>=first[cross]-1&&d.position.start+d.width<=first[cross]+first[extent]+1)d.position.coord+=delta
    yield p
   }
  }
 }
}
/** 建物の共通柱芯を固定し、各階・各住戸の開口と設備を合わせる。断面は配置検討用600mm。 */
export function coordinateBuildingFrame(input:Record<number,AutoPlan>):Record<number,AutoPlan>{
 return candidateFrame(input)
}
function candidateFrame(input:Record<number,AutoPlan>):Record<number,AutoPlan>{
 const floors=Object.values(input),base=input[1]??floors[0]!
 if(!base)return input
 const corridors=base.corridors??[base.corridor]
 const facadeXs:number[]=[],frameXs:number[]=[]
 const clamp=(x:number)=>Math.max(half,Math.min(base.widthMm-half,x))
 for(const c of corridors){
  const left=base.cells.filter(u=>Math.abs(u.x1-c.x0)<1),right=base.cells.filter(u=>Math.abs(u.x0-c.x1)<1)
  if(left.length){const x=clamp((base.balconyDepthMm??0)-half);facadeXs.push(x);frameXs.push(x,clamp(c.x0-half))}
  if(right.length){const x=clamp(base.widthMm-(base.balconyDepthMm??0)+half);facadeXs.push(x);frameXs.push(clamp(c.x1+half),x)}
 }
 const xs=[...new Set(frameXs)].sort((a,b)=>a-b)
 // 共通の通り芯の全交点に柱を置く。共用部との干渉で節点を削除しない。
 const columns=xs.flatMap((x,xi)=>{
  const adjacent=floors.flatMap(p=>p.cells.filter(u=>x>=u.x0-half-1&&x<=u.x1+half+1))
  const ys=base.frameGridY?.map(y=>Math.max(half,Math.min(base.depthMm-half,y)))??[...new Set([half,base.depthMm-half,...adjacent.flatMap(u=>[Math.max(half,u.y0),Math.min(base.depthMm-half,u.y1)])])].sort((a,b)=>a-b)
  return ys.map((y,yi)=>({id:`X${xi+1}-Y${yi+1}`,x,y}))
 })
 for(const c of columns)for(const p of floors){
  const box=columnBox(c)
  if([...(p.corridors??[p.corridor]),...(p.bridges??[]),...p.cores].some(r=>intersects(box,{x:r.x0,y:r.y0,w:r.x1-r.x0,h:r.y1-r.y0})))throw Error('共通柱と共用部が干渉します。柱を残したまま階段・EV・通路を再配置してください')
 }
 for(const x of new Set(facadeXs)){
  const row=columns.filter(c=>c.x===x)
  if(!row.some(c=>c.y<=half)||!row.some(c=>c.y>=base.depthMm-half))throw Error('建物端部の柱を確保できません。共用部・住戸配置の変更が必要です')
 }
 for(let i=0;i<columns.length;i++)for(let j=i+1;j<columns.length;j++)if(intersects(columnBox(columns[i]!),columnBox(columns[j]!)))throw Error('柱断面が重複します。住戸境界の割付を変更してください')
 for(const c of columns)for(const p of floors){const outline=p.balconyEnvelope??p.buildingOutline;if(outline&&!cellInsideOutline({id:c.id,x0:c.x-half,x1:c.x+half,y0:c.y-half,y1:c.y+half},outline))throw Error('共通柱の断面が上階の外形からはみ出します')}
 const result:Record<number,AutoPlan>={}
 const cache=new Map<string,UnitPlan39>()
 for(const [floor,p] of Object.entries(input)){
  const overrides={...p.unitPlanOverrides}
  for(const cell of p.cells){
   const corridor=corridorForCell(p,cell),left=cell.x1<=corridor.x0+1
   const placed=placeUnitPlan(p.unitTypeIdsByCell?.[cell.id]??'',p.unitPlanVariants?.[cell.id]??'A',cell,corridor,overrides[cell.id])
   if(!placed.plan||placed.status!=='ok')throw Error(`${floor}階 ${cell.id}：住戸詳細がありません`)
   const local=columns.filter(c=>intersects(columnBox(c),{x:cell.x0-600,y:cell.y0-600,w:cell.x1-cell.x0+1200,h:cell.y1-cell.y0+1200})).map(c=>({id:c.id,x:left?c.y-cell.y0:cell.y1-c.y,y:left?cell.x1-c.x:c.x-cell.x0}))
   // 柱の番号ではなく、住戸内の相対位置で同じ干渉条件を識別する。
   // 採用時には各住戸が参照する実際の柱番号へ戻す。
   const key=JSON.stringify([placed.plan,local.map(c=>({x:c.x,y:c.y}))]),saved=cache.get(key);if(saved){overrides[cell.id]={...structuredClone(saved),columns:local};continue}
   const detail=structuredClone(placed.plan);detail.columns=local;detail.frameAligned=true
   const obstacles=local.map(columnBox)
   // 同じ部屋境界上で開口を移動し、幅と接続を維持する。
   for(const d of detail.doors){if(!obstacles.some(b=>intersects(b,doorReserve(detail,d,600))))continue
    const original=d.position.start,oldPoint=d.position.orientation==='h'?{x:d.position.start+d.width/2,y:d.position.coord}:{x:d.position.coord,y:d.position.start+d.width/2},oldRooms=detail.rooms.filter(r=>oldPoint.x>=r.x-1&&oldPoint.x<=r.x+r.w+1&&oldPoint.y>=r.y-1&&oldPoint.y<=r.y+r.h+1).map(r=>r.id),limit=d.position.orientation==='h'?detail.envelope.W:detail.envelope.D
    const candidates=Array.from({length:Math.floor((limit-d.width)/100)+1},(_,i)=>i*100).sort((a,b)=>Math.abs(a-original)-Math.abs(b-original))
    let found=false
    for(const start of candidates){d.position.start=start;const q=d.position.orientation==='h'?{x:start+d.width/2,y:d.position.coord}:{x:d.position.coord,y:start+d.width/2};const connected=detail.rooms.filter(r=>q.x>=r.x-1&&q.x<=r.x+r.w+1&&q.y>=r.y-1&&q.y<=r.y+r.h+1);const external=Math.abs(d.position.coord)<1||Math.abs(d.position.coord-(d.position.orientation==='h'?detail.envelope.D:detail.envelope.W))<1
     if(!oldRooms.every(id=>connected.some(r=>r.id===id))||connected.length<(external?1:2)||obstacles.some(b=>intersects(b,doorReserve(detail,d,600))))continue
     found=true;break
    }
    if(!found)d.position.start=original
   }
   const source=structuredClone(detail); let accepted:UnitPlan39|undefined; let issues:ReturnType<typeof validateUnitLayout>=[]
   for(const candidate of partitionCandidates(source)){
   const detail=candidate
   detail.fixtures=placeFurniture(detail,source,600,(room,fixtures)=>{
    const doors=detail.doors.filter(d=>{const q=d.position.orientation==='h'?{x:d.position.start+d.width/2,y:d.position.coord}:{x:d.position.coord,y:d.position.start+d.width/2};return q.x>=room.x&&q.x<=room.x+room.w&&q.y>=room.y&&q.y<=room.y+room.h}).map(d=>({...d,position:{...d.position,coord:d.position.coord-(d.position.orientation==='h'?room.y:room.x),start:d.position.start-(d.position.orientation==='h'?room.x:room.y)}}))
    const localPlan={...detail,envelope:{...detail.envelope,W:room.w,D:room.h},rooms:[{...room,x:0,y:0}],doors,fixtures:fixtures.map(f=>({...f,x:f.x-room.x,y:f.y-room.y})),columns:[]}
    return !validateUnitLayout(localPlan,undefined,obstacles.map(b=>({...b,x:b.x-room.x,y:b.y-room.y}))).some(i=>i.code==='unreachable'||i.code==='usage-unreachable')
   },new Set(),obstacles)
   issues=[...validateUnitLayout(detail),...validateUnitLayout(detail,undefined,obstacles)]
   if(!issues.length){accepted=detail;break}
   }
   if(issues.length)throw Error(`${floor}階 ${cell.id}：共通柱割りに室内配置が適合しません：${issues.map(i=>i.message+" ("+i.x+","+i.y+")").join('／')}`)
   cache.set(key,accepted!);overrides[cell.id]=accepted!
  }
  result[Number(floor)]=applyUnitPlans({...p,buildingColumns:columns,unitPlanOverrides:overrides})
 }
 const shaftIssues=shaftContinuityIssues(result);if(shaftIssues.length)throw Error(shaftIssues.join('／'))
 return result
}










