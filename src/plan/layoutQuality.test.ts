import {expect,it} from 'vitest'
import {livingQuality,layoutMetrics} from './layoutQuality'
import {readUnitPlan} from './unitPlan39'
import {generateAutoPlan} from './autoPlan'
it('LDKを縮めた案は元の住戸案より低評価になる',()=>{
 const source=readUnitPlan('T-08-2LDK','B')!
 const small=structuredClone(source)
 for(const r of small.rooms)if(r.name.includes('LDK'))r.h/=2
 expect(livingQuality(small).areaMm2).toBeLessThan(livingQuality(source).areaMm2)
 expect(livingQuality(small).shortSideMm).toBeLessThan(livingQuality(source).shortSideMm)
})
it('吹抜けを除くレンタブル比と外形に対する利用率を分ける',()=>{
 const p=generateAutoPlan({targetPerFloor:4,storeyCount:1,storeyHeightMm:3000,spanMm:3000,unitDepthMm:6000,corridorMm:1600,layout:'中廊下',evCount:0,evStops:[],outline:{widthMm:20000,depthMm:20000}})
 p.cells=[{id:'a',x0:0,y0:0,x1:10000,y1:20000}]
 p.voids=[{id:'v',x0:10000,y0:0,x1:15000,y1:20000}]
 const m=layoutMetrics({1:p})
 expect(m.privateM2).toBe(200)
 expect(m.floorM2).toBe(300)
 expect(m.rentableRatio).toBeCloseTo(2/3)
 expect(m.envelopeRatio).toBe(.5)
})
