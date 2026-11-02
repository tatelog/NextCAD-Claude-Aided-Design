// 仕様: D-02 C5 / D-03 E-09: footprint は建物の平面の多角形（整数 mm）。
// 切った後の面積で建築面積・延床面積を計算する（この一枚では切り取り前の面積）。
import { describe, expect, it } from 'vitest'
import { polygonAreaMm2 } from './polygon'

describe('polygonAreaMm2', () => {
  it('10 m × 20 m の矩形は 200 m2 = 2e8 mm2', () => {
    const rect = [
      { x: 0, y: 0 },
      { x: 10_000, y: 0 },
      { x: 10_000, y: 20_000 },
      { x: 0, y: 20_000 },
    ]
    expect(polygonAreaMm2(rect)).toBe(200_000_000)
  })

  it('頂点の向き（時計回り・反時計回り）に依らず正の値', () => {
    const ccw = [
      { x: 0, y: 0 },
      { x: 3_000, y: 0 },
      { x: 0, y: 4_000 },
    ]
    const cw = [...ccw].reverse()
    expect(polygonAreaMm2(ccw)).toBe(6_000_000)
    expect(polygonAreaMm2(cw)).toBe(6_000_000)
  })

  it('頂点が3つ未満なら 0', () => {
    expect(polygonAreaMm2([])).toBe(0)
    expect(
      polygonAreaMm2([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toBe(0)
  })
})
