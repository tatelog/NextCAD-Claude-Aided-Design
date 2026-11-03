// 仕様（ハブ A-03 G5・D-02 C6「曲線外形との付き合わせ」）: 通りは直線の格子のまま。通りは曲線外形と交わる所で止まり、曲線外形に沿う外周の通り芯だけ円弧で書く。
// 仕様 1（外周の円弧）: 外形の円弧に沿う外周の通り芯は、同じ中心・同じ向きで、半径だけ内側へずらした円弧（同じ角度の範囲）。
// 仕様 2（直線の通り芯）: 直線の通り（x または y が一定）が円弧と交わる点は、円弧の上にあり、円弧の範囲（角度）の内に限る。
// 仕様 3（交わらない）: 円から離れた通り、または円弧の範囲の外で円と交わる通りは、交点を出さない。
// 仕様 4: 入力を書き換えず、同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import type { CurveEdge } from './curvedFootprint'
import { arcBoundsOf, arcOfStroke, arcParamsOf, gridSegmentsToArc, perimeterArc, straightGridMeetsArc, svgArcPath } from './curvedGrid'

type Arc = Extract<CurveEdge, { kind: 'arc' }>

// 中心 (0,0)、半径 1000、右の円弧（角度 -90° から +90° へ、反時計回り）
const ARC: Arc = { kind: 'arc', a: { x: 0, y: -1000 }, b: { x: 0, y: 1000 }, center: { x: 0, y: 0 }, ccw: true }
const dist = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y)

describe('曲線外形に沿う外周の通り芯（仕様 1〜4）', () => {
  it('仕様 1: 外周の円弧は、同じ中心・向きで、半径だけ内側へずれる', () => {
    const out = perimeterArc(ARC, 200)
    expect(out.center).toEqual({ x: 0, y: 0 })
    expect(out.ccw).toBe(true)
    expect(dist(out.a, { x: 0, y: 0 })).toBeCloseTo(800, 6)
    expect(dist(out.b, { x: 0, y: 0 })).toBeCloseTo(800, 6)
    // 角度（-90°・+90°）は同じ
    expect(out.a.x).toBeCloseTo(0, 6)
    expect(out.a.y).toBeCloseTo(-800, 6)
    expect(out.b.y).toBeCloseTo(800, 6)
  })

  it('仕様 2: 直線の通りが円弧と交わる点は、円弧の上にあり、円弧の範囲の内', () => {
    // x = 600 の通り。円（半径 1000）と交わる点は y = ±800（右の円弧の範囲の内）
    const pts = straightGridMeetsArc(ARC, 'x', 600)
    expect(pts).toHaveLength(2)
    for (const p of pts) {
      expect(p.x).toBeCloseTo(600, 6)
      expect(dist(p, { x: 0, y: 0 })).toBeCloseTo(1000, 6)
    }
    expect(pts.map((p) => Math.round(p.y)).sort((a, b) => a - b)).toEqual([-800, 800])
  })

  it('仕様 3: 円から離れた通りは交点が無い。円弧の範囲の外（左側）で交わる通りも出さない', () => {
    expect(straightGridMeetsArc(ARC, 'x', 1500)).toEqual([])
    // x = -600 の通りは円と交わるが、右の円弧（x ≥ 0）の範囲の外
    expect(straightGridMeetsArc(ARC, 'x', -600)).toEqual([])
  })

  it('仕様 4: 入力を書き換えず、同じ入力には同じ出力', () => {
    const first = straightGridMeetsArc(ARC, 'x', 600)
    expect(straightGridMeetsArc(ARC, 'x', 600)).toEqual(first)
    expect(ARC.a).toEqual({ x: 0, y: -1000 })
  })
})

// 仕様 5（描いた円弧の持ち方）: 3 点で描いた円弧は、中心と向きを線に持つ。線の始点・終点（mm）から、円弧の外形（CurveEdge）に戻せる。
// 仕様 6（画面）: 円弧の外形は、SVG の path（弧）の文字列にできる。向き（反時計回り）は sweep の値に対応する。
describe('描いた円弧の中心と向き（仕様 5・6）', () => {
  it('仕様 5: 3 点（a, b, c）の円弧は、中心と向きを持つ。a → b → c の順に反時計回りなら ccw', () => {
    const p = arcParamsOf({ x: 1000, y: 0 }, { x: 0, y: 1000 }, { x: -1000, y: 0 })
    expect(p.center.x).toBeCloseTo(0, 6)
    expect(p.center.y).toBeCloseTo(0, 6)
    expect(p.ccw).toBe(true)
    expect(arcParamsOf({ x: 1000, y: 0 }, { x: 0, y: -1000 }, { x: -1000, y: 0 }).ccw).toBe(false)
  })

  it('仕様 5: 線（mm の始点・終点・中心・向き）から、円弧の外形に戻せる', () => {
    const arc = arcOfStroke({ center: { x: 0, y: 0 }, ccw: true, start: { x: 0, y: -1000 }, end: { x: 0, y: 1000 } })
    expect(arc).toEqual({ kind: 'arc', a: { x: 0, y: -1000 }, b: { x: 0, y: 1000 }, center: { x: 0, y: 0 }, ccw: true })
  })

  it('仕様 6: 円弧の外形は、SVG の弧（A）の path にできる。反時計回りは sweep 1、180 度を超えるものは large 1', () => {
    const arc = { kind: 'arc' as const, a: { x: 0, y: -1000 }, b: { x: 0, y: 1000 }, center: { x: 0, y: 0 }, ccw: true }
    expect(svgArcPath(arc)).toBe('M 0 -1000 A 1000 1000 0 0 1 0 1000')
    expect(svgArcPath({ ...arc, ccw: false })).toBe('M 0 -1000 A 1000 1000 0 0 0 0 1000')
  })
})

// 仕様 7（通りを円弧で止める）: 直線の通りは、自動作成の範囲（矩形）の内で、円弧の交点まで。交点が 1 つなら、交点から範囲の中央の側の端まで。交点が 2 つなら、その間。交点が無ければ範囲の全長。
// 仕様 8: 入力を書き換えず、同じ入力には同じ出力。
describe('通りを円弧で止める（仕様 7・8）', () => {
  const BOUNDS = { x0: 0, x1: 1000, y0: -3000, y1: 3000 }

  it('仕様 7: 交点が無ければ、範囲の全長（x 方向の通りは y が一定、y 方向は x が一定）', () => {
    // y = 1500 は円（半径 1000）と交わらない
    expect(gridSegmentsToArc(ARC, 'y', 1500, BOUNDS)).toEqual([{ a: { x: 0, y: 1500 }, b: { x: 1000, y: 1500 } }])
  })

  it('仕様 7: 交点が 1 つなら、交点から、範囲の中央と同じ側の端まで（建物は中央の側にある）', () => {
    // 右の円弧（x ≥ 0）の y = 600 の交点は (800, 600) の 1 点（(-800, 600) は円弧の外）。範囲の中央 500 より右なので、左端 0 から交点まで
    expect(gridSegmentsToArc(ARC, 'y', 600, BOUNDS)).toEqual([{ a: { x: 0, y: 600 }, b: { x: 800, y: 600 } }])
    // 左の円弧（x ≤ 0）なら、交点 (-800, 600) から右端まで
    const leftArc: Arc = { kind: 'arc', a: { x: 0, y: 1000 }, b: { x: 0, y: -1000 }, center: { x: 0, y: 0 }, ccw: true }
    expect(gridSegmentsToArc(leftArc, 'y', 600, { x0: -1000, x1: 1000, y0: -3000, y1: 3000 })).toEqual([{ a: { x: -800, y: 600 }, b: { x: 1000, y: 600 } }])
  })

  it('仕様 7: 交点が 2 つなら、その間', () => {
    const fullCircle: Arc = { kind: 'arc', a: { x: 1000, y: 0 }, b: { x: -1000, y: 0 }, center: { x: 0, y: 0 }, ccw: true }
    // 上の半円（ccw、x=1000 → -1000 を通る）に、y = 600 の 2 点（±800）が両方乗る
    const segs = gridSegmentsToArc(fullCircle, 'y', 600, { x0: -2000, x1: 2000, y0: 0, y1: 0 })
    expect(segs).toEqual([{ a: { x: -800, y: 600 }, b: { x: 800, y: 600 } }])
  })

  it('仕様 8: 同じ入力には同じ出力で、入力を書き換えない', () => {
    const first = gridSegmentsToArc(ARC, 'y', 600, BOUNDS)
    expect(gridSegmentsToArc(ARC, 'y', 600, BOUNDS)).toEqual(first)
    expect(BOUNDS.x1).toBe(1000)
  })
})

// 仕様 9（外接する範囲）: 円弧の列の外接する範囲（最小・最大の x・y）。円弧の範囲（角度）の内だけを数え、円の全体は数えない。
describe('円弧の外接する範囲（仕様 9）', () => {
  it('仕様 9: 右半分の円弧（中心 0・半径 1000）の範囲は、x 0〜1000、y −1000〜1000', () => {
    const b = arcBoundsOf([ARC])
    expect(b.minX).toBeCloseTo(0, 3)
    expect(b.maxX).toBeCloseTo(1000, 3)
    expect(b.minY).toBeCloseTo(-1000, 3)
    expect(b.maxY).toBeCloseTo(1000, 3)
  })
})
