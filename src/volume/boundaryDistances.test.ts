import { expect,it } from 'vitest'
import { boundaryDistances } from './setbackLines'
it('鍵型の各境界から建物までの距離を返す',()=>{
 const lot=[{x:0,y:0},{x:10000,y:0},{x:10000,y:10000},{x:5000,y:10000},{x:5000,y:5000},{x:0,y:5000}]
 const b=[{x:6000,y:1000},{x:8000,y:1000},{x:8000,y:3000},{x:6000,y:3000}]
 const lines=boundaryDistances(lot,b)!
 expect(lines).toHaveLength(6)
 expect(lines[0]!.valueMm).toBe(1000)
 expect(lines[1]!.valueMm).toBe(2000)
 expect(lines[3]!.valueMm).toBeCloseTo(Math.sqrt(5000000))
})
it('境界を跨ぐ場合は距離ゼロ',()=>{
 const lot=[{x:0,y:0},{x:10000,y:0},{x:10000,y:10000},{x:0,y:10000}]
 const b=[{x:2000,y:-1000},{x:3000,y:-1000},{x:3000,y:1000},{x:2000,y:1000}]
 expect(boundaryDistances(lot,b)![0]!.valueMm).toBe(0)
})
