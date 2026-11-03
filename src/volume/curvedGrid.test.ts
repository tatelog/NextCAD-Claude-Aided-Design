// 仕様（ハブ A-03 G5・D-02 C6「曲線外形との付き合わせ」）: 通りは直線の格子のまま。通りは曲線外形と交わる所で止まり、曲線外形に沿う外周の通り芯だけ円弧で書く。
// 仕様 1（外周の円弧）: 外形の円弧に沿う外周の通り芯は、同じ中心・同じ向きで、半径だけ内側へずらした円弧（同じ角度の範囲）。
// 仕様 2（直線の通り芯）: 直線の通り（x または y が一定）が円弧と交わる点は、円弧の上にあり、円弧の範囲（角度）の内に限る。
// 仕様 3（交わらない）: 円から離れた通り、または円弧の範囲の外で円と交わる通りは、交点を出さない。
// 仕様 4: 入力を書き換えず、同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import type { CurveEdge } from './curvedFootprint'
import { perimeterArc, straightGridMeetsArc } from './curvedGrid'

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
