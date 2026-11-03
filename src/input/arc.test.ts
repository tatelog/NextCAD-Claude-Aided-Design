// 仕様（ハブ D-04 曲線モード「円弧の操作（円弧は中心を先に置くか）」は未決。仮置き: 始点・通過点・終点の 3 点で円弧を描く）:
// 仕様 1: 3 点を通る円弧を、始点から通過点を経て終点へ、整数 mm の点列で返す。端は始点と終点ちょうど。
// 仕様 2: 点列は一つの円の上にある（半径の誤差は 1 mm 以内）。通過点の近くを通る。
// 仕様 3: 3 点が一直線（円にならない）なら、例外（RangeError）。同じ点が重なっても例外。
// 仕様 4: 円弧は既定で 32 区間（33 点）。
import { describe, expect, it } from 'vitest'
import { arcThroughPoints } from './arc'

const near = (a: { x: number; y: number }, b: { x: number; y: number }, tol = 1) => Math.hypot(a.x - b.x, a.y - b.y) <= tol

describe('arcThroughPoints（3 点を通る円弧）', () => {
  // 中心 (0, 0)、半径 1000 の上半分
  const a = { x: 1000, y: 0 }
  const b = { x: 0, y: 1000 }
  const c = { x: -1000, y: 0 }

  it('端は始点と終点ちょうど、点は 33 個（32 区間）', () => {
    const pts = arcThroughPoints(a, b, c)
    expect(pts).toHaveLength(33)
    expect(pts[0]).toEqual(a)
    expect(pts[pts.length - 1]).toEqual(c)
  })

  it('点列は中心 (0,0)・半径 1000 の円の上（1 mm 以内）', () => {
    for (const p of arcThroughPoints(a, b, c)) {
      expect(Math.abs(Math.hypot(p.x, p.y) - 1000)).toBeLessThanOrEqual(1)
    }
  })

  it('通過点の近くを通る', () => {
    const pts = arcThroughPoints(a, b, c)
    expect(pts.some((p) => near(p, b))).toBe(true)
  })

  it('整数 mm', () => {
    for (const p of arcThroughPoints(a, b, c)) {
      expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true)
    }
  })

  it('一直線の 3 点、または同じ点を含む 3 点は、例外', () => {
    expect(() => arcThroughPoints({ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 1000, y: 0 })).toThrow(RangeError)
    expect(() => arcThroughPoints({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1000, y: 0 })).toThrow(RangeError)
  })
})
