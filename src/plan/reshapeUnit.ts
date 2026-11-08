import {wetAccessIssues} from './wetAccess'
import {placeFurniture,doorReserve} from './furniturePlacement'
import {partitionAxis,availableUsage,usageCandidates} from './partitionConstraints'
import type {UnitPlan39} from './unitPlan39'
type Box={x:number;y:number;w:number;h:number}
export type LayoutIssue={code:string;message:string;x:number;y:number}
export type LayoutRules={passage:number;roomWidth:number;roomArea:number;toiletWidth:number;toiletDepth:number}
export const defaultLayoutRules:LayoutRules={passage:600,roomWidth:1800,roomArea:5,toiletWidth:910,toiletDepth:1700}
const overlap=(a:Box,b:Box)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1
const inside=(a:Box,b:Box)=>a.x>=b.x-1&&a.y>=b.y-1&&a.x+a.w<=b.x+b.w+1&&a.y+a.h<=b.y+b.h+1
const doorPoint=(d:UnitPlan39['doors'][number])=>d.position.orientation==='h'?{x:d.position.start+d.width/2,y:d.position.coord}:{x:d.position.coord,y:d.position.start+d.width/2}
export function validateUnitLayout(p:UnitPlan39,rules=defaultLayoutRules,obstacles:Box[]=[]):LayoutIssue[]{
 const issues:LayoutIssue[]=wetAccessIssues(p);const add=(code:string,message:string,x:number,y:number)=>issues.push({code,message,x,y})
 const envelope={x:0,y:0,w:p.envelope.W,h:p.envelope.D}
 for(const b of obstacles){if(p.fixtures.some(f=>overlap(f,b)))add("column-fixture","柱と設備が干渉",b.x,b.y);if(p.doors.some(d=>overlap(doorReserve(p,d,rules.passage),b)))add("column-door","柱と開口が干渉",b.x,b.y)}
 for(const r of p.rooms){
  if(!inside(r,envelope))add('outside',`${r.name}が住戸外に出ています`,r.x,r.y)
  if((r.name==='WC'||r.name.includes('トイレ'))&&!(Math.min(r.w,r.h)>=rules.toiletWidth&&Math.max(r.w,r.h)>=rules.toiletDepth))add('minimum-size',`${r.name}: ${rules.toiletWidth}×${rules.toiletDepth} mmを確保できません`,r.x,r.y)
  if(r.kind==='居室'&&(Math.min(r.w,r.h)<rules.roomWidth||r.w*r.h<rules.roomArea*1e6))add('minimum-size',`${r.name}: 最小幅・面積不足`,r.x,r.y)
  if(r.name.includes('廊下')&&Math.min(r.w,r.h)<rules.passage)add('minimum-size','廊下幅不足',r.x,r.y)
 }
 for(let i=0;i<p.rooms.length;i++)for(const b of p.rooms.slice(i+1)){const a=p.rooms[i]!;if(overlap(a,b))add('room-overlap',`${a.name}と${b.name}の間仕切りが重なっています`,a.x,a.y)}
 for(let i=0;i<p.fixtures.length;i++){
  const f=p.fixtures[i]!;if(!p.rooms.some(r=>inside(f,r)))add('fixture-outside',`${f.kind}が部屋内に収まりません`,f.x,f.y)
  const room=p.rooms.find(r=>inside(f,r));if(room&&usageCandidates(f,rules.passage).length&&!availableUsage(f,room,p.fixtures.filter(g=>g.id!==f.id),rules.passage))add('usage-space',`${f.kind}: 使用スペースを確保できません（設計余白 ${f.kind.includes('テーブル')?750:rules.passage} mm）`,f.x+f.w/2,f.y+f.h/2)
  for(const g of p.fixtures.slice(i+1))if(overlap(f,g))add('collision',`${f.kind}と${g.kind}が重なっています`,f.x,f.y)
 }
 // 開口前後の通行・開閉用の保留領域。開き方向が不明な場合は両側を保守的に確保する。
 const openings=p.doors.map(d=>({d,q:doorPoint(d),box:doorReserve(p,d,rules.passage)}))
 for(const {d,q,box} of openings){
  const horizontal=d.position.orientation==='h',alongLimit=horizontal?p.envelope.W:p.envelope.D,crossLimit=horizontal?p.envelope.D:p.envelope.W
  if(!Number.isFinite(d.width)||d.width<=0||!Number.isFinite(d.position.start)||!Number.isFinite(d.position.coord)||d.position.start<0||d.position.start+d.width>alongLimit||d.position.coord<0||d.position.coord>crossLimit)add('door-outside',`${d.id}: 開口全体が住戸外形内に収まりません`,q.x,q.y)
  if(d.width<rules.passage)add('door-width',`${d.id}: 開口幅不足`,q.x,q.y)
  if(p.fixtures.some(f=>overlap(f,box)))add('door-blocked',`${d.id}: 入口・扉の可動域を什器が塞いでいます`,q.x,q.y)
  const connected=p.rooms.filter(r=>q.x>=r.x-1&&q.x<=r.x+r.w+1&&q.y>=r.y-1&&q.y<=r.y+r.h+1)
  const external=q.x<=1||q.y<=1||q.x>=p.envelope.W-1||q.y>=p.envelope.D-1
  if(connected.length<(external?1:2))add('door-disconnected',`${d.id}: 開口が部屋境界につながっていません`,q.x,q.y)
 }
 // 歩行幅を持つ点の到達探索。壁は開口だけを通過できる。
 const step=150,radius=rules.passage/2
 const axis=(extent:number,orientation:'h'|'v')=>{
  const points=new Set<number>();for(let x=radius;x<=extent-radius;x+=step)points.add(x)
  for(const b of [...p.rooms,...p.fixtures,...obstacles]){
   const start=orientation==='h'?b.x:b.y,end=start+(orientation==='h'?b.w:b.h)
   for(const edge of [start,end]){points.add(edge-radius);points.add(edge+radius)}
  }
  for(const {d,q} of openings)if(d.position.orientation===orientation)points.add(orientation==='h'?q.x:q.y)
  const walls=new Set(p.rooms.flatMap(r=>orientation==='h'?[r.x,r.x+r.w]:[r.y,r.y+r.h]))
  return [...points].filter(x=>x>=radius&&x<=extent-radius&&!walls.has(x)).sort((a,b)=>a-b)
 }
 const xs=axis(p.envelope.W,'h'),ys=axis(p.envelope.D,'v'),nx=xs.length,ny=ys.length
 if(nx*ny>100000){add('unverified','動線検査の対象範囲を超えています',0,0);return issues}
 const roomAt=(x:number,y:number)=>p.rooms.findIndex(r=>x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h)
 // 内壁を身体幅がまたぐ点は開口の中だけ歩行可能。壁際の狭い残りを
 // 歩ける領域として数えると、室単体と住戸全体で判定が変わってしまう。
 const throughOpening=(orientation:'h'|'v',coord:number,along:number)=>p.doors.some(d=>d.position.orientation===orientation&&Math.abs(d.position.coord-coord)<1&&along-radius>=d.position.start-1&&along+radius<=d.position.start+d.width+1)
 const wallClear=(x:number,y:number,r:UnitPlan39['rooms'][number])=>
  (x-radius>=r.x-1||throughOpening('v',r.x,y))&&
  (x+radius<=r.x+r.w+1||throughOpening('v',r.x+r.w,y))&&
  (y-radius>=r.y-1||throughOpening('h',r.y,x))&&
  (y+radius<=r.y+r.h+1||throughOpening('h',r.y+r.h,x))
 const nodes=new Map<number,{x:number;y:number;room:number}>()
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=xs[i]!,y=ys[j]!,room=roomAt(x,y);if(room<0||!wallClear(x,y,p.rooms[room]!))continue;if([...p.fixtures,...obstacles].some(f=>overlap({x:x-radius,y:y-radius,w:radius*2,h:radius*2},f)))continue;nodes.set(j*nx+i,{x,y,room})}
 const seen=new Set<number>(),queue:number[]=[]
 // 住戸の探索は玄関から始める。室単体の家具配置検査では、その室の外周扉を使う。
 const entrances=openings.filter(({d})=>d.kind==='玄関ドア')
 const starts=entrances.length?entrances:openings
 for(const {q} of starts)if(q.y<=1||q.x<=1||q.x>=p.envelope.W-1||q.y>=p.envelope.D-1){for(const [k,n] of nodes)if(Math.hypot(n.x-q.x,n.y-q.y)<=rules.passage){seen.add(k);queue.push(k)}}
 for(let cursor=0;cursor<queue.length;cursor++){
  const k=queue[cursor]!,a=nodes.get(k)!
  for(const next of [k-1,k+1,k-nx,k+nx]){
   const b=nodes.get(next);if(!b||seen.has(next)||Math.hypot(a.x-b.x,a.y-b.y)>step*2+.1)continue
   if(a.room!==b.room&&!openings.some(({d})=>{
    const v=d.position.orientation==='v',from=v?a.x:a.y,to=v?b.x:b.y,coord=d.position.coord
    if((from-coord)*(to-coord)>0||from===to)return false
    const t=(coord-from)/(to-from),along=v?a.y+(b.y-a.y)*t:a.x+(b.x-a.x)*t
    return along>=d.position.start+radius-1&&along<=d.position.start+d.width-radius+1
   }))continue
   const swept={x:Math.min(a.x,b.x)-radius,y:Math.min(a.y,b.y)-radius,w:Math.abs(a.x-b.x)+2*radius,h:Math.abs(a.y-b.y)+2*radius}
   if([...p.fixtures,...obstacles].some(f=>overlap(swept,f)))continue
   seen.add(next);queue.push(next)
  }
 }
 for(const r of p.rooms.filter(r=>r.kind==='居室'||r.kind==='水回り'||r.name.includes('玄関')||r.name.includes('廊下')||r.name==='WC'||r.name.includes('浴'))){const rid=p.rooms.indexOf(r),free=[...nodes].filter(([,n])=>n.room===rid);if(!free.length||free.some(([k])=>!seen.has(k)))add('unreachable',`${r.name}: 玄関から通れない領域があります（設計通路幅 ${rules.passage} mm）`,r.x+r.w/2,r.y+r.h/2)}
 // 使用余白は空き面積だけでなく、玄関から歩いて到達できる側を必要とする。
 // 向きが未収録の家具は、使用候補のいずれか一つへ通れることを確認する。
 const reachable=[...seen].map(k=>nodes.get(k)!)
 for(const f of p.fixtures){
  const rid=p.rooms.findIndex(r=>inside(f,r));if(rid<0)continue
  const uses=usageCandidates(f,rules.passage).filter(u=>inside(u,p.rooms[rid]!)&&!p.fixtures.some(g=>g.id!==f.id&&overlap(g,u)))
  if(uses.length&&!uses.some(u=>reachable.some(n=>n.room===rid&&n.x>=u.x-1&&n.x<=u.x+u.w+1&&n.y>=u.y-1&&n.y<=u.y+u.h+1)))add('usage-unreachable',`${f.kind}: 使用スペースへ玄関から通れません（設計通路幅 ${rules.passage} mm）`,f.x+f.w/2,f.y+f.h/2)
 }
 return issues
}
export function reshapeUnit(source:UnitPlan39,width:number,rules=defaultLayoutRules){
 return resizeUnit(source,width,source.envelope.W*source.envelope.D/width,rules)
}
/** 自動配置の空き区画への拡張。水回り固定・使用空間の検査は等面積変形と共通。 */
export function resizeUnit(source:UnitPlan39,width:number,depth:number,rules=defaultLayoutRules,options:{fixShafts?:boolean}={}){
 if(!Number.isFinite(width)||width<500)throw new Error('間口は500 mm以上を指定してください')
 if(!Number.isFinite(depth)||depth<500||depth>30000||width>30000)throw new Error('変形可能な寸法範囲を超えています')
 const fixed=options.fixShafts?source.fixtures.filter(f=>f.kind==="PS"):[]
 const ax=partitionAxis(source,width,"x",fixed.flatMap(f=>[f.x,f.x+f.w])),ay=partitionAxis(source,depth,"y",fixed.flatMap(f=>[f.y,f.y+f.h]))
 if(!ax.valid||!ay.valid)return {plan:structuredClone(source),issues:[{code:"fixed-wet",message:options.fixShafts?"PS位置・寸法と水回り寸法を固定したまま、この外形に収めることはできません":"水回り寸法を固定したまま、この外形に収めることはできません",x:0,y:0}],valid:false}
 const X=ax.map,Y=ay.map
 const plan:UnitPlan39=structuredClone(source);plan.envelope.W=width;plan.envelope.D=depth
 plan.rooms=source.rooms.map(r=>({...r,x:X(r.x),y:Y(r.y),w:X(r.x+r.w)-X(r.x),h:Y(r.y+r.h)-Y(r.y),area_m2:(X(r.x+r.w)-X(r.x))*(Y(r.y+r.h)-Y(r.y))/1e6}))
 plan.doors=source.doors.map(d=>({...d,position:{...d.position,coord:d.position.orientation==='h'?Y(d.position.coord):X(d.position.coord),start:(d.position.orientation==='h'?X(d.position.start+d.width/2):Y(d.position.start+d.width/2))-d.width/2}}))
 plan.fixtures=placeFurniture(plan,source,rules.passage,(room,fixtures)=>{
  const doors=plan.doors.filter(d=>{const q=doorPoint(d);return q.x>=room.x&&q.x<=room.x+room.w&&q.y>=room.y&&q.y<=room.y+room.h}).map(d=>({...d,position:{...d.position,coord:d.position.coord-(d.position.orientation==='h'?room.y:room.x),start:d.position.start-(d.position.orientation==='h'?room.x:room.y)}}))
  const local:UnitPlan39={...plan,envelope:{...plan.envelope,W:room.w,D:room.h},rooms:[{...room,x:0,y:0}],fixtures:fixtures.map(f=>({...f,x:f.x-room.x,y:f.y-room.y})),doors,columns:[]}
  return !validateUnitLayout(local,rules).some(i=>i.code==='unreachable'||i.code==='usage-unreachable')
 },new Set(fixed.map(f=>f.id)))
 plan.columns=source.columns.map(c=>({...c}))
 const issues=validateUnitLayout(plan,rules)
 for(const c of source.columns)if(c.x>width||c.y>depth)issues.push({code:"column-fixed",message:"固定された柱中心が住戸外形の外に出ます",x:c.x,y:c.y})
 for(const old of source.rooms.filter(r=>r.name.includes('浴'))){const r=plan.rooms.find(r=>r.id===old.id)!;if(!((r.w>=old.w&&r.h>=old.h)||(r.w>=old.h&&r.h>=old.w)))issues.push({code:'bath-size',message:`${r.name}: 元案の浴室寸法 ${old.w}×${old.h} mmを確保できません`,x:r.x,y:r.y})}
 return {plan,issues,valid:issues.length===0}
}

