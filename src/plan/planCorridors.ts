import type {AutoPlan} from './autoPlan'
import type {Rect} from './candidateCells'
/** 各住戸の入口側にある廊下。旧保存データの単一廊下にも対応する。 */
export function corridorForCell(plan:Pick<AutoPlan,'corridor'|'corridors'>,cell:Rect):Rect{
 return [...(plan.corridors??[plan.corridor])].sort((a,b)=>
  Math.min(Math.abs(cell.x1-a.x0),Math.abs(cell.x0-a.x1))-
  Math.min(Math.abs(cell.x1-b.x0),Math.abs(cell.x0-b.x1)))[0]!
}
