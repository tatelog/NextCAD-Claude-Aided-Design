import {it,expect} from 'vitest'
import {prepareVolumePlan} from './volumePlan'
import {entryChecks} from './entryChecks'
it('共通柱割り後の保存住戸でも玄関扉が共用廊下へ張り出さない',()=>{
 const result=prepareVolumePlan({footprint:[{x:0,y:0},{x:17000,y:0},{x:17000,y:60000},{x:0,y:60000}],storey_count:2,storey_height:3000},[],{layout:'中廊下',span:4200,corridor:1600,unitDepth:6100})
 for(const p of Object.values(result.plans)){
  expect(entryChecks(p).issues).toEqual([])
  expect(p.cells.some(c=>c.x1<=p.corridor.x0)).toBe(true)
  expect(p.cells.some(c=>c.x0>=p.corridor.x1)).toBe(true)
 }
},60000)
