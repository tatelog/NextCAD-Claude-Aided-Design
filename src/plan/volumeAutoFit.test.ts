import {it,expect} from 'vitest'
import {prepareVolumePlan} from './volumePlan'
it('ボリュームからの計算で住戸の自動調整を実行し不成立理由を保持する',()=>{
 const result=prepareVolumePlan({footprint:[{x:0,y:0},{x:25000,y:0},{x:25000,y:47000},{x:0,y:47000}],storey_count:1,storey_height:3000},[],{layout:'中廊下',span:3000,corridor:1600,unitDepth:6000})
 const plan=result.plans[1]!
 expect(plan.automaticUnitRejections).toBeDefined()
 expect(plan.unitsPerFloor).toBe(plan.cells.length)
 for(const cell of plan.cells){expect(plan.unitPlanOverrides?.[cell.id]).toBeDefined();expect(plan.unitPlanStatus?.[cell.id]).toBe('ok')}
 expect(plan.cells.length+Object.keys(plan.automaticUnitRejections!).length).toBeGreaterThan(0)
},20000)
