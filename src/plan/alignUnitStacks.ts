import type {AutoPlan} from './autoPlan'
import {applyUnitPlans} from './applyUnitPlans'
import {corridorForCell} from './planCorridors'
import {placeUnitPlan} from './unitPlan39'
import {resizeUnit,validateUnitLayout} from './reshapeUnit'
import {shaftContinuityIssues} from './shaftContinuity'
import {cellInsideOutline} from './units'
import type {Rect} from './candidateCells'
const overlaps=(a:Rect,b:Omit<Rect,'id'>)=>Math.min(a.x1,b.x1)>Math.max(a.x0,b.x0)+.01&&Math.min(a.y1,b.y1)>Math.max(a.y0,b.y0)+.01
/** 成立済みの住戸詳細を上下階の共通候補として再利用する。設備の移動・横引きは仮定しない。 */
export function alignUnitStacks(input:Record<number,AutoPlan>):Record<number,AutoPlan>{
 let result={...input}
 const ids=new Set(Object.values(input).flatMap(p=>p.shaftRects.filter(s=>s.kind==='PS'&&s.unitId).map(s=>s.unitId!)))
 for(const id of ids){
  const stack=Object.fromEntries(Object.entries(result).map(([f,p])=>[f,{shaftRects:p.shaftRects.filter(s=>s.unitId===id)}]))
  if(!shaftContinuityIssues(stack).length)continue
  const occupied=Object.keys(result).map(Number).filter(f=>result[f]!.cells.some(c=>c.id===id)),top=Math.max(...occupied)
  const floors=Array.from({length:top},(_,i)=>i+1)
  if(floors.some(f=>!result[f]?.cells.some(c=>c.id===id)))continue
  const candidates=occupied.map(f=>({p:result[f]!,cell:result[f]!.cells.find(c=>c.id===id)!})).sort((a,b)=>(b.cell.x1-b.cell.x0)*(b.cell.y1-b.cell.y0)-(a.cell.x1-a.cell.x0)*(a.cell.y1-a.cell.y0))
  let best:Record<number,AutoPlan>|undefined,bestArea=-1
  for(const {p:source,cell} of candidates){
   const type=source.unitTypeIdsByCell?.[id]??'',variant=source.unitPlanVariants?.[id]??'A'
   const detail=placeUnitPlan(type,variant,cell,corridorForCell(source,cell),source.unitPlanOverrides?.[id]).plan
   if(!detail||validateUnitLayout(detail).length)continue
   const replacements:Record<number,AutoPlan>={};let valid=true
   for(const f of floors){
    const p=result[f]!
    const original=p.cells.find(c=>c.id===id)!
    const oldPlaced=placeUnitPlan(p.unitTypeIdsByCell?.[id]??'',p.unitPlanVariants?.[id]??'A',original,corridorForCell(p,original),p.unitPlanOverrides?.[id])
    const target=placeUnitPlan(type,variant,cell,corridorForCell(source,cell),detail).shafts??[]
    const sameShafts=target.length>0&&oldPlaced.shafts?.length===target.length&&target.every(s=>oldPlaced.shafts!.some(t=>t.id===s.id&&(['x0','x1','y0','y1'] as const).every(k=>Math.abs(s[k]-t[k])<=1)))
    const clear=(c:Rect)=>!!p.buildingOutline&&cellInsideOutline(c,p.buildingOutline)&&![...p.cores,...(p.bridges??[]),...(p.voids??[]),...(p.corridors??[p.corridor]),...p.cells.filter(o=>o.id!==id)].some(o=>overlaps(c,o))
    const corridor=corridorForCell(p,cell),left=cell.x1<=corridor.x0+1
    const canGrow=original.x0<=cell.x0&&original.x1>=cell.x1&&original.y0<=cell.y0&&original.y1>=cell.y1&&(left?Math.abs(original.y0-cell.y0)<1&&Math.abs(original.x1-cell.x1)<1:Math.abs(original.y1-cell.y1)<1&&Math.abs(original.x0-cell.x0)<1)
    if(!sameShafts&&canGrow&&clear(original)&&p.unitTypeIdsByCell?.[id]===type){
     const grown=resizeUnit(detail,original.y1-original.y0,original.x1-original.x0,undefined,{fixShafts:true})
     const placed=placeUnitPlan(type,variant,original,corridorForCell(p,original),grown.plan)
     const matches=target.length===placed.shafts?.length&&target.every(s=>placed.shafts!.some(t=>t.id===s.id&&(['x0','x1','y0','y1'] as const).every(k=>Math.abs(s[k]-t[k])<=1)))
     if(grown.valid&&placed.entrance&&matches){replacements[f]=applyUnitPlans({...p,unitPlanOverrides:{...p.unitPlanOverrides,[id]:grown.plan},unitPlanVariants:{...p.unitPlanVariants,[id]:variant}});continue}
    }
    if(sameShafts&&oldPlaced.plan&&oldPlaced.entrance&&clear(original)&&!validateUnitLayout(oldPlaced.plan).length&&(original.x1-original.x0)*(original.y1-original.y0)>=(cell.x1-cell.x0)*(cell.y1-cell.y0)){
     replacements[f]=p;continue
    }
    if(p.unitTypeIdsByCell?.[id]!==type||!p.buildingOutline||!cellInsideOutline(cell,p.buildingOutline)||[...p.cores,...(p.bridges??[]),...(p.voids??[]),...(p.corridors??[p.corridor]),...p.cells.filter(c=>c.id!==id)].some(o=>overlaps(cell,o))||!placeUnitPlan(type,variant,cell,corridorForCell(p,cell),detail).entrance){valid=false;break}
    replacements[f]=applyUnitPlans({...p,cells:p.cells.map(c=>c.id===id?{...cell}:c),unitPlanOverrides:{...p.unitPlanOverrides,[id]:detail},unitPlanVariants:{...p.unitPlanVariants,[id]:variant}})
   }
   if(!valid)continue
   const trial={...result,...replacements}
   const shafts=Object.fromEntries(Object.entries(trial).map(([f,p])=>[f,{shaftRects:p.shaftRects.filter(s=>s.unitId===id)}]))
   if(shaftContinuityIssues(shafts).length)continue
   const area=floors.reduce((sum,f)=>{const c=trial[f]!.cells.find(c=>c.id===id)!;return sum+(c.x1-c.x0)*(c.y1-c.y0)},0)
   if(area>bestArea){best=trial;bestArea=area}
  }
  if(best)result=best
 }
 return result
}
