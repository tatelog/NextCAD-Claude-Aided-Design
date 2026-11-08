import type {AutoPlan} from './autoPlan'
import {placeUnitPlan} from './unitPlan39'
import {corridorForCell} from './planCorridors'
import {columnObstructions} from './unitColumns'
/** 全表示と積算で共通の計画柱芯。構造断面・構造適合は未確定。 */
export function frameOfPlan(plan:AutoPlan){
 const points=new Map<string,{x:number;y:number;conflict:boolean}>(),issues:string[]=[]
 for(const cell of plan.cells){
  const placed=placeUnitPlan(plan.unitTypeIdsByCell?.[cell.id]??'',plan.unitPlanVariants?.[cell.id]??'A',cell,corridorForCell(plan,cell),plan.unitPlanOverrides?.[cell.id])
  if(placed.status!=='ok'||!placed.plan)continue
  const conflicts=new Set(columnObstructions(placed.plan))
  issues.push(...[...conflicts].map(id=>`${cell.id} / ${id}：計画柱と開口・設備の干渉要確認`))
  for(const p of placed.columns??[]){const key=`${p.x.toFixed(3)},${p.y.toFixed(3)}`;points.set(key,{x:p.x,y:p.y,conflict:conflicts.has(p.id)||!!points.get(key)?.conflict})}
 }
 const columns=plan.buildingColumns?plan.buildingColumns.map(c=>({x:c.x,y:c.y,conflict:!!points.get(`${c.x.toFixed(3)},${c.y.toFixed(3)}`)?.conflict})):[...points.values()]
 return {issues,columns,xAxes:[...new Set(columns.map(p=>p.x))].sort((a,b)=>a-b),yAxes:[...new Set(columns.map(p=>p.y))].sort((a,b)=>a-b)}
}
