import type { AutoPlan } from '../plan/autoPlan'
import { slabObjectRow } from './estimateObjects'
import { slabAreaMm2 } from './slabArea'
/** 保存されている階だけを集計する。ボリュームからの複製・平面の補正はしない。 */
export function savedPlanStructureRows(plans: Record<number, AutoPlan>) {
 const entries=Object.entries(plans).sort(([a],[b])=>Number(a)-Number(b))
 if(!entries.length)return []
 const outline=(p:AutoPlan)=>p.buildingOutline??[{x:0,y:0},{x:p.widthMm,y:0},{x:p.widthMm,y:p.depthMm},{x:0,y:p.depthMm}]
 const areas=entries.map(([,p])=>slabAreaMm2(outline(p),p.balconies??[],p.voids??[]))
 const row=slabObjectRow(outline(entries[0]![1]),entries.length,entries[0]![1].ev.storey_height,areas)
 return [{...row,id:'slab-saved-floors',name:'床版（保存済み各階平面）'}]
}
