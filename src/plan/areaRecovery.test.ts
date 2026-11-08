import {it,expect} from 'vitest'
import {writeFileSync,mkdirSync} from 'node:fs'
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
 mkdirSync('work',{recursive:true})
 writeFileSync('work/area-recovery-layout.json',JSON.stringify({metrics:layoutMetrics(r.plans),plan:r.plans[1]},null,2))
 for(const p of Object.values(r.plans)){
  expect(p.widthMm).toBe(17000);expect(p.depthMm).toBe(36000)
  expect(p.cells.length).toBeGreaterThanOrEqual(4)
  for(const c of p.cells){const u=p.unitPlanOverrides![c.id]!;expect(unitAreaAllowed(u.type,(c.x1-c.x0)*(c.y1-c.y0))).toBe(true);expect(validateUnitLayout(u)).toEqual([])}
 }
 expect(layoutMetrics(r.plans).rentableRatio).toBeGreaterThan(.6)
},120000)
// 代表の決定 2026-11-08: 隙間の空きは住戸を引き延ばして埋める。
// 住戸の行（廊下沿いで、階段・EV・外形の端に挟まれた区間）に、住戸が始められる長さ（2,000 mm）以上の空きを残さない。
it('住戸の行を隣の階段・EV・外形の端まで引き延ばし、行の中に2,000 mm以上の空きを残さない',()=>{
 const volume={footprint:[{x:0,y:0},{x:17000,y:0},{x:17000,y:36000},{x:0,y:36000}],storey_count:5,storey_height:3000}
 const r=compareVolumePlans(volume,[],{selectedLayoutOnly:true,layout:'中廊下',span:4200,corridor:1600,unitDepth:6100,balconyDepth:1600,minimumFamilyRatio:1}).options['中廊下']!
 expect(r).toBeDefined()
 for(const p of Object.values(r.plans)){
  const corridor=p.corridor
  for(const left of [true,false]){
   const row=p.cells.filter(c=>left?c.x1<=corridor.x0+1:c.x0>=corridor.x1-1)
   const touching=p.cores.filter(k=>left?Math.abs(k.x1-corridor.x0)<1:Math.abs(k.x0-corridor.x1)<1)
   let intervals:Array<[number,number]>=[[0,p.depthMm]]
   for(const k of touching)intervals=intervals.flatMap(([a,b])=>k.y1<=a||k.y0>=b?[[a,b] as [number,number]]:([[a,Math.min(b,k.y0)],[Math.max(a,k.y1),b]] as Array<[number,number]>).filter(([lo,hi])=>hi>lo))
   for(const [a,b] of intervals){
    const inside=row.filter(c=>c.y0>=a-1&&c.y1<=b+1)
    if(!inside.length)continue
    const covered=inside.reduce((n,c)=>n+(c.y1-c.y0),0)
    expect(b-a-covered,`${left?'左':'右'}の行 y ${a}〜${b}`).toBeLessThan(2000)
   }
  }
 }
 expect(layoutMetrics(r.plans).rentableRatio).toBeGreaterThan(.6)
},120000)
