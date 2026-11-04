// 仕様（ハブ A-03 G130。統括の依頼 2026-11-05、t70）: 円弧は中心と R の起点を先に置く（中心 → 始点 → 終点）。
// 任意の 2 点を選ぶ方式（t70）は、二点の垂直二等分線（中心線）上に中心を置き、中心線上のずらし量で半径が決まる。
// 弦誤差は 10 mm（G130）。点は整数 mm。
// 仕様 1（中心方式）: 中心と始点で半径が決まり、終点で終わりの角が決まる。始点と終点は点列の両端にちょうど入る。
// 仕様 2（短い方の弧）: 始点から終点へは短い方の弧（|角| ≤ 180°）。反時計回りなら ccw。
// 仕様 3（弦誤差）: 隣り合う点の弦の中点は、円から 10 mm 以内（R − 10 mm 以上）。区間数は弦誤差から決める。
// 仕様 4（二点方式）: 中心は二点を結ぶ弦の垂直二等分線上。中心は二点の中点から、左の法線方向へずらし量（mm）だけ離れる。
//   ずらし量が正なら中心は左側で、弧は右側（短い方）に膨らむ。両端は二点ちょうど。
// 仕様 5（例外）: 中心と始点が同じ、二点が同じ、は RangeError。
// 仕様 6: 点列は整数 mm。
import { describe, expect, it } from 'vitest'
import { ARC_CHORD_ERROR_MM, arcFromCenterStart, arcFromTwoPoints, arcSegmentCount } from './arc'

const dist = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y)

describe('円弧の区間数（弦誤差 10 mm。G130）', () => {
  it('弦誤差は 10 mm', () => {
    expect(ARC_CHORD_ERROR_MM).toBe(10)
  })

  it('半径 1,000 mm・90° は 6 区間（弦誤差 10 mm から）', () => {
    expect(arcSegmentCount(1000, Math.PI / 2)).toBe(6)
  })

  it('角が小さければ 1 区間', () => {
    expect(arcSegmentCount(1000, 0.01)).toBe(1)
  })
})

describe('中心方式（中心 → 始点 → 終点。G130）', () => {
  const center = { x: 0, y: 0 }
  const start = { x: 1000, y: 0 }
  const end = { x: 0, y: 1000 }

  it('仕様 1: 始点と終点が点列の両端にちょうど入り、半径は中心と始点で決まる', () => {
    const r = arcFromCenterStart(center, start, end)
    expect(r.points[0]).toEqual(start)
    expect(r.points[r.points.length - 1]).toEqual(end)
    expect(r.radiusMm).toBeCloseTo(1000, 10)
    expect(r.center).toEqual(center)
  })

  it('仕様 2: 90° の反時計回りは 6 区間（点は 7 個）、ccw', () => {
    const r = arcFromCenterStart(center, start, end)
    expect(r.ccw).toBe(true)
    expect(r.points).toHaveLength(7)
  })

  it('仕様 2: 時計回りの短い方の弧は ccw が偽', () => {
    const r = arcFromCenterStart(center, start, { x: 0, y: -1000 })
    expect(r.ccw).toBe(false)
  })

  it('仕様 3: 隣り合う点の弦の中点は、円から 10 mm 以内（R − 10 mm 以上。1 mm の丸めを許す）', () => {
    const r = arcFromCenterStart(center, start, end)
    for (let i = 0; i + 1 < r.points.length; i++) {
      const p = r.points[i]!
      const q = r.points[i + 1]!
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
      expect(dist(mid, center)).toBeGreaterThanOrEqual(1000 - ARC_CHORD_ERROR_MM - 1)
    }
  })

  it('仕様 6: 点列は整数 mm', () => {
    for (const p of arcFromCenterStart(center, start, end).points) {
      expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true)
    }
  })

  it('仕様 5: 中心と始点が同じ、または中心と終点が同じなら RangeError', () => {
    expect(() => arcFromCenterStart(center, center, end)).toThrow(RangeError)
    expect(() => arcFromCenterStart(center, start, center)).toThrow(RangeError)
  })
})

describe('二点方式（t70）', () => {
  const p1 = { x: -1000, y: 0 }
  const p2 = { x: 1000, y: 0 }

  it('仕様 4: 中心は二点の垂直二等分線上（x = 0）。ずらし量 1,000 mm なら中心は (0, 1000)', () => {
    const r = arcFromTwoPoints(p1, p2, 1000)
    expect(r.center.x).toBeCloseTo(0, 10)
    expect(r.center.y).toBeCloseTo(1000, 10)
    expect(r.radiusMm).toBeCloseTo(Math.hypot(1000, 1000), 10)
  })

  it('仕様 4: 両端は二点ちょうど', () => {
    const r = arcFromTwoPoints(p1, p2, 1000)
    expect(r.points[0]).toEqual(p1)
    expect(r.points[r.points.length - 1]).toEqual(p2)
  })

  it('仕様 4: ずらし量が正なら中心は左側（y が正）、弧は右側（y が負）に膨らみ、反時計回り', () => {
    const r = arcFromTwoPoints(p1, p2, 1000)
    const mid = r.points[Math.floor(r.points.length / 2)]!
    expect(mid.y).toBeLessThan(0)
    expect(r.ccw).toBe(true)
  })

  it('仕様 4: ずらし量が負なら、弧は上に膨らみ、時計回り', () => {
    const r = arcFromTwoPoints(p1, p2, -1000)
    const mid = r.points[Math.floor(r.points.length / 2)]!
    expect(mid.y).toBeGreaterThan(0)
    expect(r.ccw).toBe(false)
  })

  it('仕様 3: 隣り合う点の弦の中点は、円から 10 mm 以内の内側', () => {
    const r = arcFromTwoPoints(p1, p2, 1000)
    for (let i = 0; i + 1 < r.points.length; i++) {
      const p = r.points[i]!
      const q = r.points[i + 1]!
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
      expect(dist(mid, r.center)).toBeGreaterThanOrEqual(r.radiusMm - ARC_CHORD_ERROR_MM - 1)
    }
  })

  it('仕様 5: 二点が同じなら RangeError', () => {
    expect(() => arcFromTwoPoints(p1, p1, 1000)).toThrow(RangeError)
  })
})
