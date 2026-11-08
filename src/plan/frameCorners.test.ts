import {it,expect} from 'vitest'
import {prepareVolumePlan} from './volumePlan'
import {intersects} from './partitionConstraints'
it('端部を支持し、柱を住戸の外壁沿いに納め、室中央と共用動線を占有しない',()=>{
 const {plans}=prepareVolumePlan({footprint:[{x:0,y:0},{x:17000,y:0},{x:17000,y:60000},{x:0,y:60000}],storey_count:2,storey_height:3000},[],{layout:'中廊下',span:4200,corridor:1600,unitDepth:6100,balconyDepth:1600})
 for(const p of Object.values(plans)){
  const columns=p.buildingColumns!; expect(columns.length).toBeGreaterThan(0)
  const xs=columns.map(c=>c.x)
  for(const x of [Math.min(...xs),Math.max(...xs)]){
   const row=columns.filter(c=>c.x===x)
   expect(Math.min(...row.map(c=>c.y))).toBeLessThanOrEqual(300)
   expect(Math.max(...row.map(c=>c.y))).toBeGreaterThanOrEqual(p.depthMm-300)
  }
  for(const c of columns){
   const box={x:c.x-300,y:c.y-300,w:600,h:600}
   for(const r of [...(p.corridors??[p.corridor]),...(p.bridges??[])])expect(intersects(box,{x:r.x0,y:r.y0,w:r.x1-r.x0,h:r.y1-r.y0})).toBe(false)
   for(const u of p.cells)if(intersects(box,{x:u.x0,y:u.y0,w:u.x1-u.x0,h:u.y1-u.y0})){
    // 共通通り芯を優先する仕様。柱を各住戸の四隅へ動かさず、外壁沿いを維持する。
    expect(Math.min(Math.abs(c.x-u.x0),Math.abs(c.x-u.x1))).toBeLessThanOrEqual(300)
   }
  }
 }
 expect(plans[1]!.buildingColumns).toEqual(plans[2]!.buildingColumns)
},60000)
