import {expect,it} from 'vitest'
import {compactPlan,unusedArea} from './compactPlan'
import {prepareVolumePlan} from '../plan/volumePlan'
const lot=[{x:-50000,y:-50000},{x:50000,y:-50000},{x:50000,y:50000},{x:-50000,y:50000}]
it('中廊下の両側に住戸奥行を揃え、共用部を確保して余り面積を算出する',()=>{
 const original=[{x:-15000,y:-21000},{x:15000,y:-21000},{x:15000,y:21000},{x:-15000,y:21000}]
 const result=compactPlan(original,lot,[],5,3000)
 expect(result.width).toBe(result.unitDepth*2+1600);expect(result.units).toBeGreaterThan(0);expect(result.unused).toBeGreaterThanOrEqual(0)
 const plan=prepareVolumePlan({footprint:result.footprint,storey_count:5,storey_height:3000},[],{layout:'中廊下',span:3000,unitDepth:result.unitDepth,corridor:1600,uniformDepth:true}).plans[1]!
 expect(plan.cores.filter(c=>c.id!=='evHall')).toHaveLength(2);expect(plan.cells.every(c=>c.x0>=0&&c.x1<=plan.widthMm)).toBe(true);expect(unusedArea(plan)*5).toBeCloseTo(result.unused)
})
it('敷地に収まらない案を適用候補にしない',()=>expect(()=>compactPlan([{x:0,y:0},{x:5000,y:0},{x:5000,y:5000},{x:0,y:5000}],[{x:0,y:0},{x:6000,y:0},{x:6000,y:6000},{x:0,y:6000}],[],5,3000)).toThrow())
