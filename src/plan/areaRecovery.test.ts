import {it,expect} from 'vitest'
import {writeFileSync} from 'node:fs'
import {compareVolumePlans} from './volumePlan'
import {layoutMetrics} from './layoutQuality'
import {unitAreaAllowed} from './unitAreaRange'
import {validateUnitLayout} from './reshapeUnit'
it('17×36mの既存外形に複数住戸を面積レンジと動線を守って配置する',()=>{
 const volume={footprint:[{x:0,y:0},{x:17000,y:0},{x:17000,y:36000},{x:0,y:36000}],storey_count:5,storey_height:3000}
 const compared=compareVolumePlans(volume,[],{selectedLayoutOnly:true,layout:'中廊下',span:4200,corridor:1600,unitDepth:6100,balconyDepth:1600,minimumFamilyRatio:1})
 expect(Object.keys(compared.options)).toEqual(['中廊下'])
 const r=compared.options['中廊下']!
 expect(r,JSON.stringify(compared.failures)).toBeDefined()
 writeFileSync('work/area-recovery-layout.json',JSON.stringify({metrics:layoutMetrics(r.plans),plan:r.plans[1]},null,2))
 for(const p of Object.values(r.plans)){
  expect(p.widthMm).toBe(17000);expect(p.depthMm).toBe(36000)
  expect(p.cells.length).toBeGreaterThanOrEqual(4)
  for(const c of p.cells){const u=p.unitPlanOverrides![c.id]!;expect(unitAreaAllowed(u.type,(c.x1-c.x0)*(c.y1-c.y0))).toBe(true);expect(validateUnitLayout(u)).toEqual([])}
 }
 expect(layoutMetrics(r.plans).rentableRatio).toBeGreaterThan(.6)
},120000)
