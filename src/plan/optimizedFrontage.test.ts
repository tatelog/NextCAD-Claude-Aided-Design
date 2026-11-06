import { describe, it, expect } from 'vitest'
import { optimizedFrontage } from './optimizedFrontage'
describe('間口の組合せ探索', () => {
 it('先頭の型の繰返しで残る余白を別の型で埋める', () => {
  const r = optimizedFrontage([5000,5000], [{id:'A',frontageMm:6000},{id:'B',frontageMm:5000}])
  expect(r.units.map(u=>u.typeId)).toEqual(['B','B'])
  expect(r.units.reduce((s,u)=>s+u.widthMm,0)).toBe(10000)
 })
 it('入らない余りを住戸に吸収せず、未知寸法を捏造しない', () => {
  const r=optimizedFrontage([11000],[{id:'A',frontageMm:6000},{id:'不明',frontageMm:null}])
  expect(r.units.map(u=>u.widthMm)).toEqual([6000])
  expect(r.units[0]?.absorbed).toBe(false)
 })
 it('同じ充填量では少ない戸数を選び、寸法を保持する',()=>{
  expect(optimizedFrontage([12000],[{id:'A',frontageMm:3000},{id:'B',frontageMm:6000}]).units.map(u=>u.typeId)).toEqual(['B','B'])
 })
})
