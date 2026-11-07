import {it,expect} from 'vitest'
import {prepareVolumePlan} from './volumePlan'
import {refreshUnitRoutes} from './refreshUnitRoutes'
import {readUnitPlan} from './unitPlan39'
const volume={footprint:[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500}],storey_count:3,storey_height:3000}
it.each(['中廊下','ツイン'] as const)('%sの生成済み配置で動線を再評価しても距離と経路が一致する',layout=>{
 const {plans}=prepareVolumePlan(volume,[],{layout,span:3000,corridor:1600,unitDepth:7400,coreMode:'回転集約'})
 for(const plan of Object.values(plans)){
  const updated=refreshUnitRoutes(plan)
  expect(updated.circulation?.routes).toEqual(plan.circulation?.routes)
  expect(updated.circulation?.routeMetrics).toEqual(plan.circulation?.routeMetrics)
  expect(updated.circulation?.elevatorRoutes).toEqual(plan.circulation?.elevatorRoutes)
  const cell=plan.cells.find(c=>{
   const d=plan.unitPlanOverrides?.[c.id]??readUnitPlan(plan.unitTypeIdsByCell?.[c.id]??'',plan.unitPlanVariants?.[c.id]??'A')
   return d?.doors.some(e=>e.kind==='玄関ドア'&&e.position.start+e.width+50<d.envelope.W)
  })!
  expect(cell).toBeDefined()
  const detail=plan.unitPlanOverrides?.[cell.id]??readUnitPlan(plan.unitTypeIdsByCell?.[cell.id]??'',plan.unitPlanVariants?.[cell.id]??'A')!
  const moved={...detail,doors:detail.doors.map(d=>d.kind==='玄関ドア'?{...d,position:{...d.position,start:d.position.start+50}}:d)}
  const changed=refreshUnitRoutes({...plan,unitPlanOverrides:{...plan.unitPlanOverrides,[cell.id]:moved}})
  const index=plan.cells.indexOf(cell)
  expect(changed.circulation!.routes[index*2]![0]).not.toEqual(plan.circulation!.routes[index*2]![0])
  expect(changed.circulation!.routeMetrics![index]).not.toEqual(plan.circulation!.routeMetrics![index])
  expect(changed.circulation!.routes[index*2]!.at(-1)).toEqual(plan.circulation!.routes[index*2]!.at(-1))
  expect(changed.shaftRects).toEqual(plan.shaftRects)
 }
},120000)
