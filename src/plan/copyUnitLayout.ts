import type {AutoPlan} from './autoPlan'
import {readUnitPlan} from './unitPlan39'
import {sameTypeUnitIds} from './unitDetail'
import {applyReshapedUnit} from './applyReshapedUnit'
export function copyUnitLayout(base:AutoPlan,id:string):{plan?:AutoPlan;error?:string}{
 const type=base.unitTypeIdsByCell?.[id],variant=base.unitPlanVariants?.[id]??'A'
 const detail=base.unitPlanOverrides?.[id]??(type?readUnitPlan(type,variant):null)
 if(!type||!detail)return {error:'反映元の住戸詳細がありません'}
 const targets=sameTypeUnitIds(id,base.cells).filter(t=>base.unitTypeIdsByCell?.[t]===type)
 if(!targets.length)return {error:'同じ寸法・タイプの住戸がありません'}
 let next=base
 for(const target of targets){
  const result=applyReshapedUnit({...next,unitPlanVariants:{...next.unitPlanVariants,[target]:variant}},target,detail)
  if(result.error||!result.plan)return {error:`住戸 ${target}：${result.error??'反映できません'}`}
  const shafts=(p:AutoPlan)=>p.shaftRects.filter(s=>s.unitId===target).map(s=>[s.id,s.kind,s.x0,s.y0,s.x1,s.y1]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))
  if(JSON.stringify(shafts(base))!==JSON.stringify(shafts(result.plan)))return {error:`住戸 ${target}：固定した縦シャフトの位置・寸法が変わります`}
  next=result.plan
 }
 return {plan:next}
}
