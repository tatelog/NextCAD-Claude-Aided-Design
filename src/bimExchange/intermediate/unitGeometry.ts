import type { AutoPlan } from '../../plan/autoPlan'
import type { UnitPlan39 } from '../../plan/unitPlan39'
import type { Rect } from '../../plan/candidateCells'
import { clearEntry } from '../../plan/entryClearance'
import { corridorForCell } from '../../plan/planCorridors'
import type { Issue, Point, SnapshotElement } from './schema'
import { normalizeRing } from './geometry'

interface VerticalSpecification { heightMm?:number; baseOffsetMm?:number; status?:'confirmed'|'estimated'|'unresolved' }
export interface WallSpecification extends VerticalSpecification { thicknessMm?:number }
export interface ColumnSpecification extends VerticalSpecification { widthMm?:number; depthMm?:number }
export interface OpeningSpecification extends VerticalSpecification {
  /** 窓の実寸幅と住戸ローカル座標の開始位置。扉は元データの実寸を使用。 */
  widthMm?:number; startMm?:number
}
export interface UnitSpecifications {
  partitionWall?:WallSpecification
  /** 外周/戸境を含む住戸包絡の壁。間仕切り厚を流用しない。 */
  envelopeWall?:WallSpecification
  /** planSpecObjectsのwall/<sorted room IDs>/<h|v>、またはenvelope/N|E|S|W。 */
  walls?:Record<string,WallSpecification>
  column?:ColumnSpecification
  door?:OpeningSpecification
  /** 元のdoor/window IDがキー。窓に共通の仮幅は設定しない。 */
  openings?:Record<string,OpeningSpecification>
}
type Line={id:string;axis:'h'|'v';coord:number;start:number;end:number;sourceIds:string[];spec?:WallSpecification}
const present=(n:number|undefined):n is number=>n!==undefined&&Number.isFinite(n)
const vertical=(s:VerticalSpecification|undefined)=>!!s&&present(s.heightMm)&&s.heightMm>0&&present(s.baseOffsetMm)&&s.status!=='unresolved'
function validateSpec(spec:UnitSpecifications) {
  for(const value of [spec.partitionWall,spec.envelopeWall,spec.column,spec.door,...Object.values(spec.walls??{}),...Object.values(spec.openings??{})]) {
    if(!value) continue
    for(const [key,n] of Object.entries(value)) {
      if(key==='status') { if(!['confirmed','estimated','unresolved'].includes(String(n))) throw new Error('仕様の確定状態が無効です');continue }
      if(!Number.isFinite(n)||(!['baseOffsetMm','startMm'].includes(key)&&Number(n)<=0)) throw new Error(`仕様寸法が無効です: ${key}`)
    }
  }
}

/** placeUnitPlanと同じclearEntry補正・寸法照合・四方向の配置。マスタ読込は行わない。 */
export function unitElements(plan:AutoPlan,cell:Rect,raw:UnitPlan39,storeyId:string,spec:UnitSpecifications,xy:(p:Point)=>Point):{elements:SnapshotElement[];issues:Issue[]} {
  validateSpec(spec)
  const detail=clearEntry(structuredClone(raw)),corridor=corridorForCell(plan,cell)
  const left=cell.x1<=corridor.x0+1,right=cell.x0>=corridor.x1-1,below=cell.y0>=corridor.y1-1
  const valid=Math.abs((left||right?cell.y1-cell.y0:cell.x1-cell.x0)-detail.envelope.W)<=1&&Math.abs((left||right?cell.x1-cell.x0:cell.y1-cell.y0)-detail.envelope.D)<=1
  const point=(x:number,y:number)=>xy(left?{x:cell.x1-y,y:cell.y0+x}:right?{x:cell.x0+y,y:cell.y1-x}:below?{x:cell.x0+x,y:cell.y0+y}:{x:cell.x1-x,y:cell.y1-y})
  const elements:SnapshotElement[]=[],issues:Issue[]=[]
  if(!valid) issues.push({code:'UNIT_PLACEMENT_INVALID',severity:'warning',message:`${storeyId}/${cell.id}: 住戸寸法が区画と一致しないため実体化しません`})
  const id=(local:string)=>JSON.stringify([storeyId,`unit:${cell.id}:${local}`])
  const make=(local:string,kind:SnapshotElement['kind'],sourceIds:string[],footprint:SnapshotElement['footprint'],s:VerticalSpecification|undefined,note:string,host?:string)=>{
    const usable=valid&&!!footprint&&vertical(s)
    const e:SnapshotElement={id:id(local),kind,storeyId,footprint:usable?footprint:null,heightMm:usable?s!.heightMm!:null,baseOffsetMm:s?.baseOffsetMm??0,status:usable?'estimated':'unresolved',source:{elementIds:[cell.id,detail.id,...sourceIds],origin:'plan',note},...(host?{hostElementId:host}:{})}
    elements.push(e);return e
  }
  const footprint=(line:Pick<Line,'axis'|'coord'|'start'|'end'>,thickness:number)=>{
    const {axis,coord,start,end}=line,t=thickness/2
    const points=axis==='h'?[[start,coord-t],[end,coord-t],[end,coord+t],[start,coord+t]]:[[coord-t,start],[coord+t,start],[coord+t,end],[coord-t,end]]
    return {outer:normalizeRing(points.map(p=>point(p[0]!,p[1]!)),true),holes:[]}
  }
  const W=detail.envelope.W,D=detail.envelope.D
  const lines:Line[]=[
    {id:'envelope/N',axis:'h',coord:0,start:0,end:W,sourceIds:[detail.id]},
    {id:'envelope/S',axis:'h',coord:D,start:0,end:W,sourceIds:[detail.id]},
    {id:'envelope/W',axis:'v',coord:0,start:0,end:D,sourceIds:[detail.id]},
    {id:'envelope/E',axis:'v',coord:W,start:0,end:D,sourceIds:[detail.id]},
  ]
  for(let i=0;i<detail.rooms.length;i++) for(const b of detail.rooms.slice(i+1)) {
    const a=detail.rooms[i]!
    let axis:'h'|'v',coord:number,start:number,end:number
    if(Math.abs(a.x+a.w-b.x)<1||Math.abs(b.x+b.w-a.x)<1) {axis='v';coord=Math.max(a.x,b.x);start=Math.max(a.y,b.y);end=Math.min(a.y+a.h,b.y+b.h)}
    else if(Math.abs(a.y+a.h-b.y)<1||Math.abs(b.y+b.h-a.y)<1) {axis='h';coord=Math.max(a.y,b.y);start=Math.max(a.x,b.x);end=Math.min(a.x+a.w,b.x+b.w)}
    else continue
    if(end>start) lines.push({id:`wall/${[a.id,b.id].sort().join('/')}/${axis}`,axis,coord,start,end,sourceIds:[a.id,b.id]})
  }
  const wallElements=new Map<string,SnapshotElement>()
  for(const line of lines) {
    line.spec=spec.walls?.[line.id]??(line.id.startsWith('wall/')?spec.partitionWall:spec.envelopeWall)
    const s=line.spec
    wallElements.set(line.id,make(line.id,'wall',line.sourceIds,s?.thicknessMm?footprint(line,s.thicknessMm):null,s,'住戸包絡/共有境界と明示仕様による壁。断面・材料の設計確認は別途必要'))
  }
  const opening=(localId:string,axis:'h'|'v',coord:number,start:number|undefined,width:number|undefined,s:OpeningSpecification|undefined,lookup?:{start:number;end:number})=>{
    const hasRange=present(start)&&present(width)&&width>0
    const lo=hasRange?start!:lookup?.start,hi=hasRange?start!+width!:lookup?.end
    const hosts=present(lo)&&present(hi)?lines.filter(l=>l.axis===axis&&Math.abs(l.coord-coord)<1&&lo>=l.start-1&&hi<=l.end+1):[]
    const host=hosts.length===1?hosts[0]:undefined,wall=host?wallElements.get(host.id):undefined
    const fits=wall?.footprint&&vertical(s)&&s!.baseOffsetMm!>=wall.baseOffsetMm&&s!.baseOffsetMm!+s!.heightMm!<=wall.baseOffsetMm+wall.heightMm!
    const g=hasRange&&fits&&host?.spec?.thicknessMm?footprint({axis,coord:host.coord,start:start!,end:start!+width!},host.spec.thicknessMm):null
    const e=make(`opening:${localId}`,'opening',[localId],g,s,'元平面の位置と明示した高さによる開口。窓は実幅・開始位置の明示が必要',wall?.id)
    if(!host) issues.push({code:'OPENING_HOST_UNRESOLVED',severity:'warning',elementId:e.id,message:'開口全幅を含む壁が一意に決まりません'})
    else if(!g) issues.push({code:'OPENING_GEOMETRY_UNRESOLVED',severity:'warning',elementId:e.id,message:'壁/開口の寸法が不足、または開口が壁の高さ範囲を外れています'})
  }
  for(const door of detail.doors) opening(door.id,door.position.orientation,door.position.coord,door.position.start,door.width,spec.openings?.[door.id]??spec.door)
  for(const window of detail.windows) {
    const room=detail.rooms.find(r=>r.id===window.room_id),s=spec.openings?.[window.id]
    if(!room) {make(`opening:${window.id}`,'opening',[window.id],null,s,'所属室がありません');continue}
    const horizontal=window.side==='N'||window.side==='S',axis=horizontal?'h':'v'
    const coord=horizontal?(window.side==='N'?room.y:room.y+room.h):(window.side==='W'?room.x:room.x+room.w)
    const start=horizontal?room.x:room.y,end=start+(horizontal?room.w:room.h)
    // 室外へはみ出す明示位置も壁への所属を推定しない。
    if(s?.startMm!==undefined&&s.widthMm!==undefined&&(s.startMm<start||s.startMm+s.widthMm>end)) {make(`opening:${window.id}`,'opening',[window.id],null,s,'窓の明示位置が所属室の辺を外れています');continue}
    opening(window.id,axis,coord,s?.startMm,s?.widthMm,s,{start,end})
  }
  for(const c of detail.columns) {
    const s=spec.column,w=s?.widthMm,d=s?.depthMm
    const shape=w&&d?{outer:normalizeRing([point(c.x-w/2,c.y-d/2),point(c.x+w/2,c.y-d/2),point(c.x+w/2,c.y+d/2),point(c.x-w/2,c.y+d/2)],true),holes:[]}:null
    make(`column:${c.id}`,'column',[c.id],shape,s,`描画と同じ柱位置補正。明示断面のみ使用。住戸ローカル座標(mm): ${JSON.stringify({x:c.x,y:c.y})}`)
  }
  return {elements,issues}
}
