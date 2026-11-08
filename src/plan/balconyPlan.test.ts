import {detailedFloorSvg} from '../export/designSheets'
import {expect,it} from 'vitest'
import {balconyReservation,attachBalconies} from './balconyPlan'
import {generateAutoPlan} from './autoPlan'
import {planExteriorQuantities,railingQuantity} from '../estimate/planExterior'
it('16.7mの中廊下は両側1.6mを確保し住戸帯5.95mになる',()=>{
 const r=balconyReservation(16700,1600,'中廊下',1600)
 expect(r.innerWidth).toBe(13500);expect(r.unitDepth).toBe(5950)
 expect(balconyReservation(16700,1600,'片廊下',1600).unitDepth).toBe(13500)
 expect(balconyReservation(16700,1600,'ツイン',1600).unitDepth).toBe(4350)
 expect(()=>balconyReservation(3000,1600,'中廊下',1600)).toThrow()
})
it('住戸の外側の形状を図面と数量で共有し下端だけを拾わない',()=>{
 const p=generateAutoPlan({targetPerFloor:1,storeyCount:2,storeyHeightMm:3000,spanMm:3000,unitDepthMm:5950,corridorMm:1600,layout:'中廊下',evCount:1,evStops:[1,2],outline:{widthMm:13500,depthMm:24000}})
 const outer=[{x:0,y:0},{x:16700,y:0},{x:16700,y:24000},{x:0,y:24000}]
 const result=attachBalconies(p,outer,16700,1600)
 expect(detailedFloorSvg(result,1)).toContain('バルコニーの配置')
 expect(result.balconies?.length).toBe(p.cells.length)
 expect(result.cells[0]!.x0).toBe(p.cells[0]!.x0+1600)
 for(const b of result.balconies!){expect(b.x1-b.x0).toBe(1600);expect(b.x0).toBeGreaterThanOrEqual(0);expect(b.x1).toBeLessThanOrEqual(16700)}
 const input={corridor:result.corridor,cores:result.cores,cells:result.cells,outline:{W:16700,D:24000},storeyCount:2,balconies:result.balconies}
 expect(planExteriorQuantities(input).balcony.quantity).toBeCloseTo(result.balconies!.reduce((s,b)=>s+(b.x1-b.x0)*(b.y1-b.y0)/1e6,0)*2)
 expect(railingQuantity(input).quantity).toBeGreaterThan(0)
 expect(planExteriorQuantities({...input,balconies:[]}).balcony.quantity).toBe(0)
})
