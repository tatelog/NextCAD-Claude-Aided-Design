import type {AutoPlan} from './autoPlan'
import type {UnitPlan39} from './unitPlan39'
import {readUnitPlan} from './unitPlan39'
/** 法定基準ではなく、配置案を比較するための幾何量。家具の使用域は別途判定する。 */
export function livingQuality(plan:UnitPlan39){
 const rooms=plan.rooms.filter(r=>/LDK|^DK$|リビング/.test(r.name))
 return {areaMm2:rooms.reduce((n,r)=>n+r.w*r.h,0),shortSideMm:rooms.length?Math.min(...rooms.map(r=>Math.min(r.w,r.h))):0}
}
export function layoutMetrics(plans:Record<number,AutoPlan>){
 let envelope=0,voidArea=0,privateArea=0,common=0,units=0,minLiving=Infinity,minShort=Infinity
 const rectArea=(r:{x0:number;x1:number;y0:number;y1:number})=>(r.x1-r.x0)*(r.y1-r.y0)
 for(const p of Object.values(plans)){
  const poly=p.buildingOutline
  envelope+=poly?.length?Math.abs(poly.reduce((sum,a,i)=>{const b=poly[(i+1)%poly.length]!;return sum+a.x*b.y-b.x*a.y},0))/2:p.widthMm*p.depthMm
  voidArea+=(p.voids??[]).reduce((n,r)=>n+rectArea(r),0)
  common+=[...(p.corridors??[p.corridor]),...(p.bridges??[]),...p.cores].reduce((n,r)=>n+rectArea(r),0)
  privateArea+=p.cells.reduce((n,c)=>n+rectArea(c),0);units+=p.cells.length
  for(const c of p.cells){const source=p.unitPlanOverrides?.[c.id]??readUnitPlan(p.unitTypeIdsByCell?.[c.id]??'',p.unitPlanVariants?.[c.id]??'A');if(!source)continue;const q=livingQuality(source);if(q.areaMm2){minLiving=Math.min(minLiving,q.areaMm2);minShort=Math.min(minShort,q.shortSideMm)}}
 }
 const floor=Math.max(0,envelope-voidArea)
 return {units,privateM2:privateArea/1e6,floorM2:floor/1e6,voidM2:voidArea/1e6,commonM2:common/1e6,unassignedM2:Math.max(0,floor-privateArea-common)/1e6,rentableRatio:floor?privateArea/floor:0,envelopeRatio:envelope?privateArea/envelope:0,minLivingM2:Number.isFinite(minLiving)?minLiving/1e6:null,minLivingShortMm:Number.isFinite(minShort)?minShort:null}
}
