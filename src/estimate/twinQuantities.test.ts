import {detailLinesOfObjects,planExteriorRow} from './estimateObjects'
import {expect,it} from 'vitest'
import {planExteriorQuantities} from './planExterior'
it('２本の廊下と渡り廊下を集計し、吹抜けを共用廊下へ加えない',()=>{
 const west={id:'w',x0:7000,x1:8600,y0:0,y1:40000},east={...west,id:'e',x0:17400,x1:19000}
 const bridges=[{id:'a',x0:8600,x1:17400,y0:0,y1:6000},{id:'b',x0:8600,x1:17400,y0:34000,y1:40000}]
 const input={corridor:west,corridors:[west,east,...bridges],cores:[],cells:[],outline:{W:26000,D:40000},storeyCount:5}
 const q=planExteriorQuantities(input)
 const lines=detailLinesOfObjects([planExteriorRow(input)],{coverMm:30,joint:'重ね継手'})
 expect(lines.find(l=>l.item==='共用廊下')?.quantity).toBeCloseTo(q.corridor.quantity)
 expect(q.corridor.quantity).toBeCloseTo((2*1600*40000+8800*12000)*5/1e6)
})
