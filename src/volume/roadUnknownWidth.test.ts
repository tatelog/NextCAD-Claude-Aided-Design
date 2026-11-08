import {it,expect} from 'vitest'
import {legalBoundaries} from './legalSlope'
it('道路幅員が未確定なら道路斜線を仮の0mで計算しない',()=>{
 const r=legalBoundaries({footprint:[{x:0,y:0},{x:10000,y:0},{x:10000,y:10000},{x:0,y:10000}],roadEdgeIndex:0,roadWidthMm:0,zone:'住居系',farPercent:200})
 expect(r.boundaries.some(b=>b.kind==='road')).toBe(false)
 expect(r.pending.join('')).toContain('幅員')
 expect(r.boundaries.some(b=>b.kind==='adjacent')).toBe(true)
})
