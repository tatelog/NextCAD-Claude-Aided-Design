import {expect,it} from 'vitest'
import {prepareVolumePlan} from './volumePlan'

it.each([['T-08-2LDK'],['T-08-2LDK','T-08-3LDK']])('既存外形で構成候補 %j を配置する',(...types)=>{
 const volume={footprint:[{x:0,y:0},{x:17000,y:0},{x:17000,y:36000},{x:0,y:36000}],storey_count:5,storey_height:3000}
 const result=prepareVolumePlan(volume,[],{layout:'中廊下',span:4200,corridor:1600,unitDepth:6100,balconyDepth:1600,allowedTypeIds:types})
 const plans=Object.values(result.plans)
 expect(plans.length).toBe(5)
 for(const plan of plans){
  expect(plan.cells.length).toBeGreaterThan(0)
  expect(plan.widthMm).toBe(17000)
  expect(plan.depthMm).toBe(36000)
  expect(Object.values(plan.unitTypeIdsByCell??{}).some(t=>t!==null&&types.includes(t))).toBe(true)
 }
},120000)
