import { expect, it } from 'vitest'
import { fitFloorPlan } from './fitFloorPlan'
import { generateAutoPlan } from './autoPlan'
it('上階で外れた住戸だけを除き、残った住戸の位置と型の列を変えない',()=>{
 const base=generateAutoPlan({targetPerFloor:8,storeyCount:3,storeyHeightMm:3000,spanMm:3000,unitDepthMm:6000,corridorMm:1600,layout:'中廊下',evCount:1,evStops:[1,2,3]})
 const outline=[{x:0,y:0},{x:base.widthMm,y:0},{x:base.widthMm,y:6000},{x:0,y:6000}]
 const upper=fitFloorPlan(base,outline)
 expect(upper.cells.length).toBeLessThan(base.cells.length)
 expect(upper.cells.every(c=>base.cells.some(b=>JSON.stringify(b)===JSON.stringify(c)))).toBe(true)
 expect(upper.spanTypes).toEqual(base.spanTypes)
 expect(upper.rooms.every(r=>upper.cells.some(c=>r.id.startsWith(c.id+'-')))).toBe(true)
})
