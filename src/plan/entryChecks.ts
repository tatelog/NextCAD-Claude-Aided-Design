import type {AutoPlan} from './autoPlan'
import {placeUnitPlan} from './unitPlan39'
import {corridorForCell} from './planCorridors'
export function entryChecks(plan:AutoPlan){
 const issues:string[]=[]
 const entries=plan.cells.flatMap(c=>{const corridor=corridorForCell(plan,c),p=placeUnitPlan(plan.unitTypeIdsByCell?.[c.id]??'',plan.unitPlanVariants?.[c.id]??'A',c,corridor,plan.unitPlanOverrides?.[c.id]);if(!p.entrySweep){issues.push(`${c.id}：玄関の開閉範囲を取得できません`);return []}
 const xs=p.entrySweep.map(p=>p.x),ys=p.entrySweep.map(p=>p.y)
 return [{id:c.id,corridor,x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys)}]})
 for(const e of entries){const vertical=e.corridor.y1-e.corridor.y0>=e.corridor.x1-e.corridor.x0,full=vertical?e.corridor.x1-e.corridor.x0:e.corridor.y1-e.corridor.y0,projection=vertical?Math.max(0,Math.min(e.x1,e.corridor.x1)-Math.max(e.x0,e.corridor.x0)):Math.max(0,Math.min(e.y1,e.corridor.y1)-Math.max(e.y0,e.corridor.y0))
 if(projection>0)issues.push(`${e.id}：扉開放時の残り幅 ${Math.max(0,Math.round(full-projection))} mm／計画廊下幅 ${Math.round(full)} mm。アルコーブ等の調整が必要`)
 }
 for(let i=0;i<entries.length;i++)for(const b of entries.slice(i+1)){const a=entries[i]!;if(Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0)>1&&Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0)>1)issues.push(`${a.id}・${b.id}：玄関扉の開閉範囲が重なる可能性があります`)}
 return {issues,entries}
}
