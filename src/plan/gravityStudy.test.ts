import {expect,it} from 'vitest'
import {gravityStudy} from './gravityStudy'
it('負担面積と上階数から軸力、単位換算した平均応力度を求める',()=>{
 const r=gravityStudy({tributaryM2:24,floorsAbove:5,deadKNM2:6,liveKNM2:2,columnMm:600,fcMPa:30,beamSpanM:6,beamTributaryM:4})
 expect(r.axialKN).toBe(960);expect(r.averageMPa).toBeCloseTo(2.6666667);expect(r.axialRatio).toBeCloseTo(0.08888889);expect(r.beamMomentKNM).toBe(144);expect(r.beamShearKN).toBe(96)
})
it('未入力や非正の断面で数値を出さない',()=>{
 expect(()=>gravityStudy({tributaryM2:24,floorsAbove:5,deadKNM2:6,liveKNM2:2,columnMm:0,fcMPa:30,beamSpanM:6,beamTributaryM:4})).toThrow()
})
