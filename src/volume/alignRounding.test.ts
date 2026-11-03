// 仕様（ハブ A-03 G64・G71、D-04 P2）: 道路に平行に合わせた外形も、回した外形も、整数 mm に丸めれば押し出せる。
// 丸めないと extrudeVolume が例外を投げ、P03Volume が volume を null にして 3D も斜線も日影も消える（欠陥）。
import { describe, expect, it } from 'vitest'
import { alignToDirection } from './alignToRoad'
import { extrudeVolume } from './extrude'
import { roundFootprintMm } from './rotation'

const RECT = [
  { x: 0, y: 0 },
  { x: 4000, y: 0 },
  { x: 4000, y: 2000 },
  { x: 0, y: 2000 },
]

describe('向きを合わせた外形の丸め（G64 の欠陥）', () => {
  it('丸めない外形は押し出せない（欠陥の前提）', () => {
    const aligned = alignToDirection(RECT, 30)
    expect(() => extrudeVolume({ footprint: aligned, storey_count: 3, storey_height: 3000 })).toThrow()
  })

  it('整数 mm に丸めた外形は押し出せる', () => {
    const aligned = roundFootprintMm(alignToDirection(RECT, 30))
    expect(() => extrudeVolume({ footprint: aligned, storey_count: 3, storey_height: 3000 })).not.toThrow()
  })

  it('丸めた後の頂点は、すべて整数 mm', () => {
    const aligned = roundFootprintMm(alignToDirection(RECT, 30))
    for (const p of aligned) {
      expect(Number.isInteger(p.x)).toBe(true)
      expect(Number.isInteger(p.y)).toBe(true)
    }
  })
})
