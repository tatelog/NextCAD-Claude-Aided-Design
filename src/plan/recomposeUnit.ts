import {livingQuality} from './layoutQuality'
import {unitAreaAllowed,unitAreaRange,unitAreaReason} from './unitAreaRange'
import type {UnitPlan39} from './unitPlan39'
import {validateUnitLayout} from './reshapeUnit'
import {placeFurniture} from './furniturePlacement'


/** 外形確定前の住戸候補。元の間仕切り座標を拘束せず、設備・家具の実寸を保持する。 */
export function recomposeUnit(source:UnitPlan39,bounds:{maxFrontage:number;maxDepth:number}):{plan?:UnitPlan39;reasons:string[]}{
 const bedrooms=source.rooms.filter(r=>r.name.startsWith('洋室'))
 const living=source.rooms.find(r=>r.name==='LDK')
 if(!living||!bedrooms.length)return {reasons:[]}
 const bath=source.rooms.find(r=>r.name.includes('浴'))!,wash=source.rooms.find(r=>r.name.includes('洗面'))!,wc=source.rooms.find(r=>r.name==='WC'||r.name.includes('トイレ'))!
 if(!bath||!wash||!wc)return {reasons:['水回りの元寸法を確認できません']}
 const bathW=bath.w,washW=wash.w,wcW=wc.w,wetW=bathW+washW+wcW
 const D=Math.min(bounds.maxDepth,source.envelope.D),hall=900,front=Math.max(2200,bath.h,wash.h,wc.h),back=D-front-hall
 if(back<2000)return {reasons:['奥行：水回り・廊下・洋室を並べる奥行が不足しています']}
 const area=(unitAreaRange(source.type)?.min??source.envelope.W*source.envelope.D/1e6)*1e6
 const quality=livingQuality(source)
 const reasons=new Set<string>()
 // 横廊下の両側に設備と洋室を置き、LDKは奥行全体を使う。
 for(const bedroomWidth of [2800,2900,3000,3100,3200,3400,3600]){
  const side=Math.max(wetW+(source.fixtures.some(f=>f.kind==='シューズ')?2800:1800),bedrooms.length*bedroomWidth)
  const lw=Math.max(3600,quality.shortSideMm,quality.areaMm2/D,area/D-side)
  const W=side+lw
  if(!unitAreaAllowed(source.type,W*D)){reasons.add(unitAreaReason(source.type));continue}
  if(W>bounds.maxFrontage){reasons.add(`間口：部屋割り候補には ${Math.ceil(W).toLocaleString()} mm が必要です（利用可能 ${Math.floor(bounds.maxFrontage).toLocaleString()} mm）`);continue}
  const p:UnitPlan39={...structuredClone(source),envelope:{...source.envelope,W,D},rooms:[],doors:[],windows:[],columns:[]}
  const room=(id:string,name:string,kind:string,x:number,y:number,w:number,h:number)=>p.rooms.push({id,name,kind,x,y,w,h,area_m2:w*h/1e6})
  room(bath.id,bath.name,bath.kind,0,front-bath.h,bathW,bath.h)
  room(wash.id,wash.name,wash.kind,bathW,front-wash.h,washW,wash.h)
  room(wc.id,wc.name,wc.kind,bathW+washW,front-wc.h,wcW,wc.h)
  room('ENT','玄関','玄関',wetW,0,side-wetW,front)
  room('HALL','廊下','廊下',0,front,side,hall)
  bedrooms.forEach((r,i)=>room(r.id,r.name,r.kind,i*side/bedrooms.length,front+hall,side/bedrooms.length,back))
  room(living.id,living.name,living.kind,side,0,lw,D)
  const door=(id:string,orientation:'h'|'v',coord:number,start:number,kind='引戸')=>p.doors.push({id,kind,width:900,position:{orientation,coord,start}})
  door('ENTRY','h',0,wetW+(side-wetW-900)/2,'玄関ドア')
  p.doors[0]!.swing_into='ENT'
  for(const r of p.rooms.filter(r=>r.id!=='HALL'&&r.id!==bath.id&&r.id!==living.id))door(`DOOR-${r.id}`,'h',r.y<front?front:front+hall,r.x+(r.w-900)/2)
  door('DOOR-BATH','v',bathW,Math.max(front-Math.min(bath.h,wash.h),Math.min(650,front-900)))
  door('DOOR-LDK','v',side,front)
  p.windows=p.rooms.filter(r=>r.kind==='居室').map(r=>({id:`WIN-${r.id}`,room_id:r.id,side:'S' as const}))
  // 家具の所属を引き継ぎ、PS・MBは玄関内の通路を避けて探索する。
  const contains=(f:UnitPlan39['fixtures'][number],r:UnitPlan39['rooms'][number])=>f.x>=r.x&&f.y>=r.y&&f.x+f.w<=r.x+r.w&&f.y+f.h<=r.y+r.h
  p.fixtures=source.fixtures.map(f=>{
   const original=source.rooms.find(r=>contains(f,r))
   const target=p.rooms.find(r=>r.id===original?.id)??p.rooms.find(r=>r.id==='ENT')!
   return {...f,x:target.x,y:target.y}
  })
  const seed=structuredClone(p)
  p.fixtures=placeFurniture(p,seed,600,(r,fixtures)=>{
   const local:UnitPlan39={...p,envelope:{...p.envelope,W:r.w,D:r.h},rooms:[{...r,x:0,y:0}],fixtures:fixtures.map(f=>({...f,x:f.x-r.x,y:f.y-r.y})),columns:[],doors:p.doors.filter(d=>{
    const q=d.position;return q.orientation==='h'?q.coord>=r.y&&q.coord<=r.y+r.h&&q.start>=r.x&&q.start+d.width<=r.x+r.w:q.coord>=r.x&&q.coord<=r.x+r.w&&q.start>=r.y&&q.start+d.width<=r.y+r.h
   }).map(d=>({...d,position:{...d.position,coord:d.position.coord-(d.position.orientation==='h'?r.y:r.x),start:d.position.start-(d.position.orientation==='h'?r.x:r.y)}}))}
   // 室間の接続は、全室を含む最終検査で確認する。
   return validateUnitLayout(local).filter(i=>i.code!=='bath-access').length===0
  })
  const issues=validateUnitLayout(p)
  if(!issues.length)return {plan:p,reasons:[]}
  issues.forEach(i=>reasons.add(i.message))
 }
 return {reasons:[...reasons]}
}


