import type {AutoPlan} from './autoPlan'
import {readUnitPlan} from './unitPlan39'
import {resizeUnit,validateUnitLayout} from './reshapeUnit'
import {corridorForCell} from './planCorridors'
import {applyReshapedUnit} from './applyReshapedUnit'
/** 案の切替を既存の区画へ反映する。旧 override を残して表示名だけ変えない。 */
export function switchUnitVariant(base:AutoPlan,id:string,variant:string):{plan?:AutoPlan;error?:string}{
 const cell=base.cells.find(c=>c.id===id),type=base.unitTypeIdsByCell?.[id]
 if(!cell||!type)return {error:'住戸タイプが未確定です'}
 const source=readUnitPlan(type,variant)
 if(!source)return {error:'選択した間取り案がありません'}
 const corridor=corridorForCell(base,cell),vertical=cell.x1<=corridor.x0+1||cell.x0>=corridor.x1-1
 const width=vertical?cell.y1-cell.y0:cell.x1-cell.x0,depth=vertical?cell.x1-cell.x0:cell.y1-cell.y0
 const resized=width===source.envelope.W&&depth===source.envelope.D?{plan:source,valid:!validateUnitLayout(source).length}:resizeUnit(source,width,depth)
 if(!resized.valid)return {error:'この間取り案では室内動線・設備寸法を確保できません'}
 return applyReshapedUnit({...base,unitPlanVariants:{...base.unitPlanVariants,[id]:variant}},id,resized.plan)
}
