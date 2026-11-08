import type {UnitPlan39} from './unitPlan39'
import {validateUnitLayout} from './reshapeUnit'
const cache=new Map<string,UnitPlan39>()
/** 玄関PSは所属室の壁際へ。扉・設備・通行の既存検証を通る候補だけ採用する。 */
export function clearEntry(p:UnitPlan39):UnitPlan39{
 if(p.frameAligned)return p
 const key=JSON.stringify(p),saved=cache.get(key);if(saved)return saved
 let result=structuredClone(p)
 result.doors=result.doors.map(d=>d.kind==='玄関ドア'?{...d,swing_into:'共用廊下'}:d)
 for(const f of result.fixtures.filter(f=>f.kind==='PS')){
  const r=result.rooms.find(r=>f.x>=r.x&&f.y>=r.y&&f.x+f.w<=r.x+r.w+1&&f.y+f.h<=r.y+r.h+1)
  if(!r||!r.name.includes('玄関'))continue
  const points=[{x:r.x,y:r.y},{x:r.x+r.w-f.w,y:r.y},{x:r.x,y:r.y+r.h-f.h},{x:r.x+r.w-f.w,y:r.y+r.h-f.h}]
  for(const point of points){const candidate={...result,fixtures:result.fixtures.map(g=>g.id===f.id?{...g,...point}:g)};if(validateUnitLayout(candidate).length<=validateUnitLayout(result).length){result=candidate;break}}
 }
 // 共用廊下へ張り出さない内開き候補。室内の通路・家具条件も検証する。
 const inward=structuredClone(result)
 for(const d of inward.doors.filter(d=>d.kind==='玄関ドア')){
  const room=inward.rooms.find(r=>r.y===0&&d.position.start>=r.x&&d.position.start+d.width<=r.x+r.w&&r.h>=d.width)
  if(room)d.swing_into=room.id
 }
 if(inward.doors.filter(d=>d.kind==='玄関ドア').every(d=>d.swing_into!=='共用廊下')&&validateUnitLayout(inward).every(i=>validateUnitLayout(result).some(old=>old.code===i.code&&old.message===i.message)))result=inward
 if(cache.size>500)cache.clear();cache.set(key,result);return result
}


