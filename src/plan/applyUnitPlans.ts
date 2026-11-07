import {corridorForCell} from './planCorridors'
import type { AutoPlan } from './autoPlan'
import { placeUnitPlan } from './unitPlan39'
export function applyUnitPlans(plan:AutoPlan):AutoPlan {
 const status:Record<string,string>={}
 const shaftRects:AutoPlan['shaftRects']=[]
 const rooms=plan.cells.flatMap(cell=>{
  const type=plan.unitTypeIdsByCell?.[cell.id]
  const placed=placeUnitPlan(type??'',plan.unitPlanVariants?.[cell.id]??'A',cell,corridorForCell(plan,cell),plan.unitPlanOverrides?.[cell.id])
  status[cell.id]=placed.status
  if(placed.shafts)shaftRects.push(...placed.shafts)
  else if(placed.status==='仮の部屋割り')shaftRects.push(...plan.shaftRects.filter(s=>s.kind==='PS'&&s.unitId===cell.id))
  return placed.status==='仮の部屋割り'?plan.rooms.filter(r=>r.id.startsWith(cell.id+'-')):placed.rooms
 })
 shaftRects.push(...plan.shaftRects.filter(s=>s.kind!=='PS'))
 return {...plan,rooms,shaftRects,shafts:{...plan.shafts,ps:shaftRects.filter(s=>s.kind==='PS').length},unitPlanStatus:status}
}
