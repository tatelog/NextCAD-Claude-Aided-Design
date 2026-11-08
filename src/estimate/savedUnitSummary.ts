import type {AutoPlan} from '../plan/autoPlan'
import {roomsByUnit} from './unitTypeBreakdown'
/** 保存された各階・各住戸の実室面積。階数倍率や代表住戸の面積を流用しない。 */
export function savedUnitSummary(plans:Record<number,AutoPlan>){
 const groups=new Map<string,{type:string,count:number,totalM2:number,averageM2:number}>()
 for(const p of Object.values(plans)){
  const rooms=roomsByUnit(p.rooms,p.cells)
  for(const c of p.cells){
   const detail=p.unitPlanOverrides?.[c.id]
   const type=detail?.type??p.unitTypeIdsByCell?.[c.id]?.replace(/^T-08-/,'')??p.unitType
   const area=detail?detail.rooms.reduce((s,r)=>s+r.w*r.h/1e6,0):(rooms.get(c.id)??[]).reduce((s,r)=>s+(r.x1-r.x0)*(r.y1-r.y0)/1e6,0)
   const row=groups.get(type)??{type,count:0,totalM2:0,averageM2:0}
   row.count++;row.totalM2+=area;row.averageM2=row.totalM2/row.count;groups.set(type,row)
  }
 }
 return [...groups.values()]
}
