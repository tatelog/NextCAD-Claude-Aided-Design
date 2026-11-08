import type {UnitPlan39} from './unitPlan39'
import {intersects,usageCandidates} from './partitionConstraints'
type Box={x:number;y:number;w:number;h:number}
const inside=(a:Box,b:Box)=>a.x>=b.x-1&&a.y>=b.y-1&&a.x+a.w<=b.x+b.w+1&&a.y+a.h<=b.y+b.h+1
export function doorReserve(p:UnitPlan39,d:UnitPlan39['doors'][number],passage:number):Box{
 const v=d.position.orientation==='v',q={x:v?d.position.coord:d.position.start+d.width/2,y:v?d.position.start+d.width/2:d.position.coord}
 const swing=p.rooms.find(r=>r.code===d.swing_into||r.id===d.swing_into)
 const opens=!d.kind.includes('引')&&d.kind!=='開口'
 let before=passage,after=passage
 if(opens&&swing){const center=v?swing.x+swing.w/2:swing.y+swing.h/2;if(center<(v?q.x:q.y))before=Math.max(passage,d.width);else after=Math.max(passage,d.width)}
 else if(opens)before=after=Math.max(passage,d.width)
 return {x:v?q.x-before:q.x-d.width/2,y:v?q.y-d.width/2:q.y-before,w:v?before+after:d.width,h:v?d.width:before+after}
}
/** 同じ部屋の家具をまとめて探索。後の家具が置けなければ前の家具の位置・向きを戻す。 */
export function placeFurniture(p:UnitPlan39,source:UnitPlan39,passage:number,roomAccessible?:(room:UnitPlan39['rooms'][number],fixtures:UnitPlan39['fixtures'])=>boolean,fixedIds:ReadonlySet<string>=new Set(),obstacles:Box[]=[]){
 const placed=new Map<string,UnitPlan39['fixtures'][number]>(),doors=p.doors.map(d=>doorReserve(p,d,passage))
 for(let ri=0;ri<p.rooms.length;ri++){
  const room=p.rooms[ri]!,old=source.rooms[ri]!
  const fixtures=source.fixtures.filter(f=>source.rooms.find(r=>inside(f,r))?.id===old.id).sort((a,b)=>b.w*b.h-a.w*a.h)
  const options=fixtures.map(f=>{
   if(fixedIds.has(f.id))return inside(f,room)&&!obstacles.some(o=>intersects(f,o))&&!doors.some(d=>intersects(f,d))?[{...f}]:[]
   const target={x:room.x+f.x-old.x,y:room.y+f.y-old.y}
   const all:typeof p.fixtures=[]
   for(const [w,h] of [[f.w,f.h],[f.h,f.w]] as [number,number][]){
    const xs=new Set([room.x,room.x+room.w-w,target.x]),ys=new Set([room.y,room.y+room.h-h,target.y])
    for(let x=room.x+100;x+w<=room.x+room.w;x+=100)xs.add(x)
    for(let y=room.y+100;y+h<=room.y+room.h;y+=100)ys.add(y)
    // 判定は位置と寸法だけで行い、通った候補だけ家具の属性を写す（軽くするため。結果と順序は同じ）
    for(const x of xs)for(const y of ys){const c={x,y,w:w!,h:h!};if(inside(c,room)&&!obstacles.some(o=>intersects(c,o))&&!doors.some(d=>intersects(c,d)))all.push({...f,x,y,w:w!,h:h!})}
   }
   // 同じ向き・近い座標だけで探索枠を使い切らない。壁沿いと四隅を
   // 両方向で先に試し、中央に動線を残してから細かな位置を調整する。
   const edges=(a:Box)=>Number(Math.abs(a.x-room.x)<1||Math.abs(a.x+a.w-room.x-room.w)<1)+Number(Math.abs(a.y-room.y)<1||Math.abs(a.y+a.h-room.y-room.h)<1)
   // 並べ替えの鍵（壁に接する数・元位置からの距離）は候補ごとに 1 回だけ求める。比べ方と安定な並べ替えは元のまま
   const keyed=all.map(a=>({a,e:edges(a),d:Math.hypot(a.x-target.x,a.y-target.y)}))
   return keyed.sort((m,n)=>n.e-m.e||m.d-n.d).map(k=>k.a)
  })
  const accepted:typeof p.fixtures=[],reserved:Box[]=[];let visits=0,leaves=0
  const search=(i:number):boolean=>{
   if(i===fixtures.length){if(++leaves>200)return false;return roomAccessible?.(room,accepted)??true}
   if(++visits>4000||leaves>200)return false
   for(const c of options[i]!){
    if(accepted.some(a=>intersects(c,a))||reserved.some(a=>intersects(c,a)))continue
    const uses=c.kind==='PS'?[undefined]:usageCandidates(c,passage).filter(u=>inside(u,room)&&!obstacles.some(o=>intersects(u,o))&&!accepted.some(a=>intersects(u,a)))
    for(const u of uses){accepted.push(c);if(u)reserved.push(u);if(search(i+1))return true;accepted.pop();if(u)reserved.pop()}
   }
   return false
  }
  if(search(0))for(const f of accepted)placed.set(f.id,f)
 }
 // 不成立は元位置を残して通常の検証で拒否する。家具を削除して成立扱いにしない。
 return source.fixtures.map(f=>placed.get(f.id)??{...f})
}
