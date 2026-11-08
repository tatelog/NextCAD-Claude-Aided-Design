import {entryChecks} from './entryChecks'
import {frameOfPlan} from './planFrame'
import {it,expect} from 'vitest'
import {prepareVolumePlan} from './volumePlan'
it('幅17mの住戸帯で成立しない型を先に除き、配置後の大量欠落を防ぐ',()=>{
 const result=prepareVolumePlan({footprint:[{x:0,y:0},{x:17000,y:0},{x:17000,y:60000},{x:0,y:60000}],storey_count:1,storey_height:3000},[],{layout:'中廊下',span:4200,corridor:1600,unitDepth:6100,balconyDepth:1600})
 const p=result.plans[1]!
 expect(entryChecks(p).issues).toEqual([])
 expect(frameOfPlan(p).issues).toEqual([])
 expect(p.cells.length).toBeGreaterThan(5)
 expect(Object.keys(p.automaticUnitRejections??{})).toHaveLength(0)
 for(const c of p.cells) expect(p.unitPlanStatus?.[c.id]).toBe('ok')
},60000)

