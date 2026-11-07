import type {AutoPlan} from './autoPlan'
import {placeUnitPlan} from './unitPlan39'
import {corridorForCell} from './planCorridors'
import {routePairMetrics} from './routePair'
import {routeCovered} from './routeCoverage'
/** 共用部を固定した住戸編集用。既存の経路の玄関・廊下への接続区間を更新する。 */
export function refreshUnitRoutes(plan:AutoPlan):AutoPlan {
 const previous=plan.circulation
 if(!previous)return plan
 if(previous.routes.length!==plan.cells.length*2||(previous.evCount>0&&previous.elevatorRoutes?.length!==plan.cells.length))throw new Error('住戸と共用動線の対応を再計算してください')
 const corridors=plan.corridors??[plan.corridor]
 const areas=[...corridors,...(plan.bridges??[]),...plan.cores,...(previous.evCount?[previous.lobby]:[])]
 const routes=previous.routes.map(r=>r.map(p=>({...p}))),elevatorRoutes=(previous.elevatorRoutes??[]).map(r=>r.map(p=>({...p})))
 plan.cells.forEach((cell,i)=>{
  const corridor=corridorForCell(plan,cell)
  const entrance=placeUnitPlan(plan.unitTypeIdsByCell?.[cell.id]??'',plan.unitPlanVariants?.[cell.id]??'A',cell,corridor,plan.unitPlanOverrides?.[cell.id]).entrance
  if(!entrance)throw new Error('玄関開口が共用廊下につながりません')
  for(const route of [routes[2*i]!,routes[2*i+1]!,...(previous.evCount?[elevatorRoutes[i]!]:[])]){
   if(route.length<3)throw new Error('共用動線の接続区間がありません')
   route[0]={...entrance};route[1]={x:(corridor.x0+corridor.x1)/2,y:entrance.y}
   if(!routeCovered(route,areas,600)||!routeCovered(route.slice(1),areas,corridor.x1-corridor.x0))throw new Error('変更後の玄関から共用動線の通行幅を確保できません')
  }
 })
 const routeMetrics=plan.cells.map((c,i)=>({unitId:c.id,...routePairMetrics(routes[2*i]!,routes[2*i+1]!)}))
 if(routeMetrics.some(m=>!m.distinctDestinations))throw new Error('異なる階段入口への動線を確保できません')
 return {...plan,circulation:{...previous,routes,elevatorRoutes,routeMetrics}}
}
