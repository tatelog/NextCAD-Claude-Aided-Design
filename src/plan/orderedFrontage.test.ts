import { expect, it } from 'vitest'
import { orderedFrontage } from './orderedFrontage'
it('寸法が合いやすい型に置換せず選んだ順番で繰り返す',()=>{
 const r=orderedFrontage(Array(10).fill(3000),[{id:'A',frontageMm:6000},{id:'B',frontageMm:9000}])
 expect(r.units.map(u=>u.typeId)).toEqual(['A','B','A','B'])
 expect(r.units.map(u=>u.startMm)).toEqual([0,6000,15000,21000])
 expect(r.units.map(u=>u.widthMm)).toEqual([6000,9000,6000,9000])
})
it('収まらない端部は別の型で埋めない',()=>{
 const r=orderedFrontage([3000,3000,3000],[{id:'A',frontageMm:6000},{id:'B',frontageMm:9000}])
 expect(r.units.map(u=>u.typeId)).toEqual(['A'])
})
