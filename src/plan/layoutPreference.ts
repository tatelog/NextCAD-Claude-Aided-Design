import type {AutoPlan} from './autoPlan'
import {layoutMetrics} from './layoutQuality'
export interface LayoutPreference {unitCount?:number;privateM2:number;maxSharedRouteM:number;maxNearestStairM:number;maxSecondStairM:number;meanElevatorM:number}
/** 面積を優先し、同面積では戸数、次に共用部の移動距離を比較する。法定歩行距離ではない。 */
export function preferLayout(a:LayoutPreference,b:LayoutPreference){
 if(Math.abs(a.privateM2-b.privateM2)>.000001)return a.privateM2>b.privateM2
 if((a.unitCount??0)!==(b.unitCount??0))return (a.unitCount??0)>(b.unitCount??0)
 if(a.maxSharedRouteM!==b.maxSharedRouteM)return a.maxSharedRouteM<b.maxSharedRouteM
 if(a.maxNearestStairM!==b.maxNearestStairM)return a.maxNearestStairM<b.maxNearestStairM
 if(a.maxSecondStairM!==b.maxSecondStairM)return a.maxSecondStairM<b.maxSecondStairM
 return a.meanElevatorM<b.meanElevatorM
}
export function layoutPreference(plans:Record<number,AutoPlan>):LayoutPreference{
 const nearest:number[]=[],second:number[]=[],shared:number[]=[],lifts:number[]=[]
 let missing=false
 for(const p of Object.values(plans)){
  if(p.cells.length!==(p.circulation?.routeMetrics?.length??0))missing=true
  for(const r of p.circulation?.routeMetrics??[]){
   if(!r.distinctDestinations||![r.firstMm,r.secondMm,r.sharedMm].every(n=>Number.isFinite(n)&&n>=0))missing=true
   nearest.push(Math.min(r.firstMm,r.secondMm)/1000)
   second.push(Math.max(r.firstMm,r.secondMm)/1000)
   shared.push(r.sharedMm/1000)
  }
  for(const route of p.circulation?.elevatorRoutes??[])lifts.push(route.slice(1).reduce((sum,b,i)=>sum+Math.hypot(b.x-route[i]!.x,b.y-route[i]!.y),0)/1000)
  if(p.circulation?.evCount&&p.cells.length!==(p.circulation.elevatorRoutes?.length??0))missing=true
 }
 return {unitCount:Object.values(plans).reduce((n,p)=>n+p.cells.length,0),privateM2:layoutMetrics(plans).privateM2,maxSharedRouteM:missing||!shared.length?Infinity:Math.max(...shared),maxNearestStairM:missing||!nearest.length?Infinity:Math.max(...nearest),maxSecondStairM:missing||!second.length?Infinity:Math.max(...second),meanElevatorM:missing?Infinity:lifts.length?lifts.reduce((a,b)=>a+b,0)/lifts.length:0}
}
