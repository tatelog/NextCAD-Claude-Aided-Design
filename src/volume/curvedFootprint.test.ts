// 仕様: 曲線を含む外形（D-02 C5・C9、A-03 G3・G7）。外形は線分と円弧の閉じた列。
// 仕様 1（G3）: 辺は直線（line）か円弧（arc）。円弧は始点・終点・中心・向き（ccw）を持つ。
// 仕様 2: 辺は前の辺の終点から始まる（連続）。最後の辺の終点は最初の辺の始点に一致する（閉じている）。
// 仕様 3: 円弧の始点と終点は、中心から同じ半径（1 mm の誤差まで）でなければ弾く。
// 仕様 4（G7 の IFC2X3）: 円弧は、弦の誤差（maxErrorMm）以内の折れ線に直せる。端点は正確に残す。
// 仕様 5: 直線だけの外形は、折れ線の面積と一致する。円弧を含めば、円に近づく（半円の面積の誤差が小さい）。
import { describe, expect, it } from 'vitest'
import { validateLoop, arcToPolyline, loopToPolygon, type CurveEdge } from './curvedFootprint'
import { polygonAreaMm2 } from '../geom/polygon'

describe('validateLoop（連続と閉じ）', () => {
  it('連続して閉じた直線だけの外形は通る', () => {
    const loop: CurveEdge[] = [
      { kind: 'line', a: { x: 0, y: 0 }, b: { x: 10_000, y: 0 } },
      { kind: 'line', a: { x: 10_000, y: 0 }, b: { x: 10_000, y: 10_000 } },
      { kind: 'line', a: { x: 10_000, y: 10_000 }, b: { x: 0, y: 0 } },
    ]
    expect(() => validateLoop(loop)).not.toThrow()
  })

  it('辺がつながらなければ弾く', () => {
    const loop: CurveEdge[] = [
      { kind: 'line', a: { x: 0, y: 0 }, b: { x: 10_000, y: 0 } },
      { kind: 'line', a: { x: 9_000, y: 0 }, b: { x: 0, y: 0 } },
    ]
    expect(() => validateLoop(loop)).toThrow()
  })

  it('円弧の始点と終点が中心から違う半径なら弾く', () => {
    const loop: CurveEdge[] = [
      { kind: 'arc', a: { x: 10_000, y: 0 }, b: { x: 0, y: 12_000 }, center: { x: 0, y: 0 }, ccw: true },
      { kind: 'line', a: { x: 0, y: 12_000 }, b: { x: 10_000, y: 0 } },
    ]
    expect(() => validateLoop(loop)).toThrow()
  })
})

describe('arcToPolyline（円弧の折れ線化）', () => {
  it('端点は正確に残り、弦の誤差は maxErrorMm 以内', () => {
    const arc: CurveEdge = { kind: 'arc', a: { x: 10_000, y: 0 }, b: { x: 0, y: 10_000 }, center: { x: 0, y: 0 }, ccw: true }
    const pts = arcToPolyline(arc, 10)
    expect(pts[0]).toEqual({ x: 10_000, y: 0 })
    expect(pts[pts.length - 1]).toEqual({ x: 0, y: 10_000 })
    for (const p of pts) expect(Math.abs(Math.hypot(p.x, p.y) - 10_000)).toBeLessThanOrEqual(10.5)
  })
})

describe('loopToPolygon（直線だけの外形と、円弧を含む外形）', () => {
  it('直線だけの矩形は面積が一致する', () => {
    const loop: CurveEdge[] = [
      { kind: 'line', a: { x: 0, y: 0 }, b: { x: 10_000, y: 0 } },
      { kind: 'line', a: { x: 10_000, y: 0 }, b: { x: 10_000, y: 10_000 } },
      { kind: 'line', a: { x: 10_000, y: 10_000 }, b: { x: 0, y: 10_000 } },
      { kind: 'line', a: { x: 0, y: 10_000 }, b: { x: 0, y: 0 } },
    ]
    expect(polygonAreaMm2(loopToPolygon(loop, 10))).toBe(100_000_000)
  })

  it('半円と直線の外形は、半円の面積に近い（誤差 1％ 以内）', () => {
    const r = 10_000
    const loop: CurveEdge[] = [
      { kind: 'arc', a: { x: r, y: 0 }, b: { x: -r, y: 0 }, center: { x: 0, y: 0 }, ccw: true },
      { kind: 'line', a: { x: -r, y: 0 }, b: { x: r, y: 0 } },
    ]
    const area = polygonAreaMm2(loopToPolygon(loop, 10))
    const half = (Math.PI * r * r) / 2
    expect(Math.abs(area - half) / half).toBeLessThan(0.01)
  })
})
