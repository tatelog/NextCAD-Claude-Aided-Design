import {DEFAULT_BALCONY_DEPTH} from '../plan/balconyPlan'
import {layoutMetrics} from '../plan/layoutQuality'
import type {Point} from '../geom/viewport'
import type {SlopeBoundary} from '../volume/slope'
import {placementAllowed} from '../volume/placementGuard'
import {prepareVolumePlan} from '../plan/volumePlan'
import {outlineDimensions,resizeDimensions} from '../volume/resizeDimensions'
import type {AutoPlan} from '../plan/autoPlan'
import {masterOf} from '../plan/unitTypeMaster'
import candidates from '../plan/unitTypeCandidates.json'
export function unusedArea(plan:AutoPlan){
 return layoutMetrics({1:plan}).unassignedM2
}
export function compactPlan(from:readonly Point[],lot:readonly Point[],boundaries:SlopeBoundary[],storeys:number,height:number){
 const d=outlineDimensions(from)
 if(from.length!==4)throw Error('長方形の外形を描いてください')
 const maxLength=Math.min(60000,Math.max(24000,Math.floor(d.depth/1000)*1000))
 let best:{footprint:Point[];width:number;depth:number;unitDepth:number;unused:number;units:number;ratio:number}|null=null
 const unitDepths=[...new Set(masterOf(candidates).map(t=>t.depth_mm).filter((n):n is number=>n!==null&&Number.isFinite(n)&&n>0))]
 for(const unitDepth of unitDepths)for(let depth=Math.max(18000,maxLength-8000);depth<=maxLength;depth+=1000){
  const width=2*unitDepth+1600+2*DEFAULT_BALCONY_DEPTH,footprint=resizeDimensions(from,width,depth)
  if(!placementAllowed(lot,footprint,6))continue
  try{
   const candidate=prepareVolumePlan({footprint,storey_count:storeys,storey_height:height},boundaries,{layout:'中廊下',span:3000,unitDepth,corridor:1600,uniformDepth:true})
   const plans=Object.values(candidate.plans),units=plans.reduce((n,p)=>n+p.cells.length,0)
   const unused=plans.reduce((n,p)=>n+unusedArea(p),0),ratio=unused/(width*depth*plans.length/1e6)
   if(units>0&&(!best||ratio<best.ratio-1e-6||Math.abs(ratio-best.ratio)<1e-6&&units>best.units))best={footprint,width,depth,unitDepth,unused,units,ratio}
  }catch{/* 収まらない候補は採らない */}
 }
 if(!best)throw Error('この位置では中廊下・階段・EVが収まりません。終了して位置を調整するか、敷地内の広い場所へ外形を描き直してください。')
 return best
}
