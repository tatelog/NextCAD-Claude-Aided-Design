import type {UnitPlan39} from '../plan/unitPlan39'
import {placeUnitPlan} from '../plan/unitPlan39'
import type {AutoPlan} from '../plan/autoPlan'
import {corridorForCell} from '../plan/planCorridors'
import {fixtureLabel,type Fixture} from '../plan/fixtures'
import type {DetailLine} from './estimateDetail'
import type {SpecObject} from './specPackages'
import {RAILING_HEIGHT_MM} from './planExterior'
import {provisionalServices} from './provisionalServices'

const bath=(name:string)=>/浴室|UB|ユニットバス/.test(name)
export function unitSpecObjects(prefix:string,unit:UnitPlan39,floor:number):SpecObject[] {
 const rows:SpecObject[]=[]
 const add=(id:string,part:string,name:string,quantity:number|null,unitName:string,extra:Partial<SpecObject>={})=>rows.push({id:`${prefix}/${id}`,part,name:`${prefix} ${name}`,quantity,unit:unitName,category:'内装',floor,basis:'平面の実寸・配置数',...extra})
 for(const r of unit.rooms){
  if(bath(r.name))continue
  add(`${r.id}/floor`,'床',`${r.name} 床`,r.w*r.h/1e6,'m2')
  add(`${r.id}/ceiling`,'天井',`${r.name} 天井`,r.w*r.h/1e6,'m2')
 }
 // 部屋の共有境界を一度だけ壁として拾う。両面込み仕様なので部屋ごとに重ねない。
 for(let i=0;i<unit.rooms.length;i++)for(let j=i+1;j<unit.rooms.length;j++){
  const a=unit.rooms[i]!,b=unit.rooms[j]!
  if(bath(a.name)||bath(b.name))continue
  let axis:'h'|'v',coord:number,start:number,end:number
  if(Math.abs(a.x+a.w-b.x)<1||Math.abs(b.x+b.w-a.x)<1){axis='v';coord=Math.max(a.x,b.x);start=Math.max(a.y,b.y);end=Math.min(a.y+a.h,b.y+b.h)}
  else if(Math.abs(a.y+a.h-b.y)<1||Math.abs(b.y+b.h-a.y)<1){axis='h';coord=Math.max(a.y,b.y);start=Math.max(a.x,b.x);end=Math.min(a.x+a.w,b.x+b.w)}
  else continue
  if(end<=start)continue
  const openings=unit.doors.filter(d=>d.position.orientation===axis&&Math.abs(d.position.coord-coord)<1)
  const openingWidthMm=openings.reduce((s,d)=>s+Math.max(0,Math.min(end,d.position.start+d.width)-Math.max(start,d.position.start)),0)
  add(`wall/${[a.id,b.id].sort().join('/')}/${axis}`,'壁',`${a.name}・${b.name} 間仕切り`,null,'m2',{lengthMm:end-start,openingWidthMm,basis:'共有境界の片面投影。高さ入力後に開口控除'})
 }
 for(const d of unit.doors){
  if(bath(d.kind)||d.between?.some(id=>bath(unit.rooms.find(r=>r.id===id)?.name??'')))continue
  add(`door/${d.id}`,d.kind.includes('玄関')?'玄関戸':'室内戸',`${d.kind}（幅${d.width}mm）`,1,'箇所')
 }
 for(const w of unit.windows)add(`window/${w.id}`,'窓',`窓 ${w.room_id} ${w.side}`,null,'m2',{basis:'実際の開口幅・高さが未登録。確認した開口面積を入力'})
 for(const f of unit.fixtures){
  const part=f.kind.includes('キッチン')?'キッチン':f.kind==='浴槽'||bath(f.kind)?'ユニットバス':f.kind.includes('洗面')?'洗面':/^(便器|WC)$/.test(f.kind)?'便器':/クローゼット|収納|シューズ/.test(f.kind)?'収納':null
  if(part)add(`fixture/${f.id}`,part,`${part} ${f.id}（図示${f.w}×${f.h}mm）`,1,'台',{widthMm:f.w,depthMm:f.h})
 }
 return [...rows,...provisionalServices(prefix,unit,floor)]
}
export function planSpecObjects(plans:Record<number,AutoPlan>,manual:readonly Fixture[],details:readonly DetailLine[]):SpecObject[]{
 const rows:SpecObject[]=[]
 for(const [floor,p] of Object.entries(plans))for(const cell of p.cells){
  const placed=placeUnitPlan(p.unitTypeIdsByCell?.[cell.id]??'',p.unitPlanVariants?.[cell.id]??'A',cell,corridorForCell(p,cell),p.unitPlanOverrides?.[cell.id])
  if(placed.status==='ok'&&placed.plan) rows.push(...unitSpecObjects(`${floor}F/${cell.id}/${placed.plan.id}`,placed.plan,Number(floor)).map(o=>o.id.includes('/fixture/')?{...o,fixtureId:`auto-${floor}-${cell.id}-${o.id.split('/fixture/')[1]}`} : o))
 }
 for(const f of manual)rows.push({id:`manual/${f.id}`,fixtureId:f.id,part:fixtureLabel(f.item),name:`手配置 ${f.unitId??''} ${fixtureLabel(f.item)}`,quantity:1,unit:'台',category:'内装',basis:'手配置の実台数'})
 for(const d of details){
  if(d.quantity<=0)continue
  // 内装と什器は上の部材明細に置き換える。既存の一括面積には混ぜない。
  if(d.category==='内装'&&!d.item.includes('階段'))continue
  const part=d.item.includes('型枠')?'型枠':d.item.includes('コンクリート')?'コンクリート':d.item.includes('鉄筋')?'鉄筋':d.item.includes('外壁')?'外壁':d.item.includes('屋根')?'屋根':d.item.includes('バルコニー')?'バルコニー':d.item.includes('廊下')?'廊下':d.item.includes('サッシ')?'窓':/屋内階段|内部階段/.test(d.item)?'屋内階段':/屋外階段|外部階段/.test(d.item)?'屋外階段':d.item.includes('手すり')?'手すり':null
  if(part){const stair=part.includes('階段'),rail=part==='手すり';rows.push({id:`quantity/${d.lineId}`,part,name:d.item,quantity:stair?null:rail?d.quantity/(RAILING_HEIGHT_MM/1000):d.quantity,unit:rail?'m':d.unit,category:d.category,basis:stair?'段数・踏面・蹴上の実面積が必要。平面投影面積は流用しない':rail?'配置線長（旧表示面積を表示高さで戻したもの）':d.basis,legacyLineId:d.lineId})}
 }
 return rows
}
