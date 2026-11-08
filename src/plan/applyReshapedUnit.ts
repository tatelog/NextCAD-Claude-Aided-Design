import {placeUnitPlan} from './unitPlan39'
import {corridorForCell} from './planCorridors'
import type {AutoPlan} from './autoPlan'
import type {UnitPlan39} from './unitPlan39'
import {applyUnitPlans} from './applyUnitPlans'
import {countUnits} from './units'
import {validateUnitLayout} from './reshapeUnit'
export function applyReshapedUnit(base:AutoPlan,id:string,plan:UnitPlan39):{plan?:AutoPlan;error?:string}{
 const old=base.cells.find(c=>c.id===id);if(!old)return {error:'住戸が見つかりません'}
 if(validateUnitLayout(plan).length)return {error:'動線・設備の問題を解消してください'}
 if(Math.abs((old.x1-old.x0)*(old.y1-old.y0)-plan.envelope.W*plan.envelope.D)>1)return {error:'面積が一致しません'}
 const corridor=corridorForCell(base,old)
 const c={...old},left=old.x1<=corridor.x0+1,right=old.x0>=corridor.x1-1
 if(left){c.x0=c.x1-plan.envelope.D;c.y1=c.y0+plan.envelope.W}
 else if(right){c.x1=c.x0+plan.envelope.D;c.y0=c.y1-plan.envelope.W}
 else if(c.y0>=corridor.y1-1){c.x1=c.x0+plan.envelope.W;c.y1=c.y0+plan.envelope.D}
 else{c.x0=c.x1-plan.envelope.W;c.y0=c.y1-plan.envelope.D}
 const intersects=(b:typeof c)=>Math.min(c.x1,b.x1)>Math.max(c.x0,b.x0)+1&&Math.min(c.y1,b.y1)>Math.max(c.y0,b.y0)+1
 if(base.cells.some(b=>b.id!==id&&intersects(b)))return {error:'隣の住戸と重なります'}
 const outline=base.buildingOutline??[{x:0,y:0},{x:base.widthMm,y:0},{x:base.widthMm,y:base.depthMm},{x:0,y:base.depthMm}]
 if(countUnits({outline:[...outline],cells:[c],corridors:[...(base.corridors??[base.corridor]),...(base.bridges??[]),...(base.voids??[])],cores:base.cores}).excluded.length)return {error:'建物外形・共用廊下・コアの配置範囲に収まりません'}
 if(!placeUnitPlan(base.unitTypeIdsByCell?.[id]??'',base.unitPlanVariants?.[id]??'A',c,corridor,plan).entrance)return {error:'玄関開口が共用廊下につながりません'}
 return {plan:applyUnitPlans({...base,cells:base.cells.map(b=>b.id===id?c:b),unitPlanOverrides:{...base.unitPlanOverrides,[id]:plan}})}
}
