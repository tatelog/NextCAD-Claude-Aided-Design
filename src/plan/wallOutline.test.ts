// 仕様（ハブ A-03 G4・D-02 C3「2D 図形の生成規則」）: 壁は中心線から両側に壁厚の半分ずつ広げた輪郭で描く。
// 仕様 1: 直線の壁（a → b）の輪郭は、中心線の両側に厚さの半分ずつの四角形（4 点）。
// 仕様 2: 長さ 0 の線は、輪郭を出さない（空の配列）。
// 仕様 3: 壁の線だけを輪郭にする（種類が wall の線）。種類の無い線・ほかの種類は出さない。
// 仕様 4: 入力を書き換えず、同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { wallPolygonsJoined, wallPolygonsOf, wallRectOf } from './wallOutline'

describe('壁の輪郭（仕様 1〜4）', () => {
  it('仕様 1: 水平の壁は、中心線の両側に厚さの半分ずつの四角形（左側の辺を a→b の順に、続けて右側を b→a の順に 4 点）', () => {
    const rect = wallRectOf({ x: 0, y: 0 }, { x: 1000, y: 0 }, 200)
    expect(rect).toEqual([
      { x: 0, y: 100 },
      { x: 1000, y: 100 },
      { x: 1000, y: -100 },
      { x: 0, y: -100 },
    ])
  })

  it('仕様 1: 斜めの壁も、中心線の両側に厚さの半分ずつ（長さ 1000 の 45 度の壁は、幅 200 の帯）', () => {
    const rect = wallRectOf({ x: 0, y: 0 }, { x: 1000, y: 1000 }, 200)
    const d = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y)
    // 対辺の距離が厚さ 200 になる（中心線から 100 ずつ）
    expect(d(rect[0]!, rect[3]!)).toBeCloseTo(200, 6)
    expect(d(rect[1]!, rect[2]!)).toBeCloseTo(200, 6)
  })

  it('仕様 2: 長さ 0 の線は輪郭を出さない', () => {
    expect(wallRectOf({ x: 5, y: 5 }, { x: 5, y: 5 }, 200)).toEqual([])
  })

  it('仕様 3: 壁の線（種類 wall）だけを輪郭にする', () => {
    const lines = [
      { id: 'w', a: { x: 0, y: 0 }, b: { x: 1000, y: 0 }, kind: 'wall' as const },
      { id: 'c', a: { x: 0, y: 0 }, b: { x: 0, y: 1000 }, kind: 'column' as const },
      { id: 'n', a: { x: 0, y: 0 }, b: { x: 500, y: 0 }, kind: null },
    ]
    expect(wallPolygonsOf(lines, 200)).toHaveLength(1)
  })

  it('仕様 4: 同じ入力には同じ出力で、入力を書き換えない', () => {
    const lines = [{ id: 'w', a: { x: 0, y: 0 }, b: { x: 1000, y: 0 }, kind: 'wall' as const }]
    expect(wallPolygonsOf(lines, 200)).toEqual(wallPolygonsOf(lines, 200))
    expect(lines[0]!.b).toEqual({ x: 1000, y: 0 })
  })
})

// 仕様 5（角の取り合い）: 端点が他の壁の端点と重なる（つながる）壁は、その端で厚さの半分だけ伸ばし、角を埋める。L の角は外側の角が四角に埋まる。
// 仕様 6: つながらない端は伸ばさない。
describe('壁の角の取り合い（仕様 5・6）', () => {
  const L = [
    { id: 'h', a: { x: 0, y: 0 }, b: { x: 1000, y: 0 }, kind: 'wall' as const },
    { id: 'v', a: { x: 1000, y: 0 }, b: { x: 1000, y: 1000 }, kind: 'wall' as const },
  ]

  it('仕様 5: L の角では、横の壁の右端と縦の壁の下端が伸び、外側の角（1100, -100）を含む', () => {
    const polys = wallPolygonsJoined(L, 200)
    expect(polys).toHaveLength(2)
    const h = polys[0]!
    const v = polys[1]!
    expect(h.map((p) => Math.round(p.x))).toContain(1100)
    expect(v.map((p) => Math.round(p.y))).toContain(-100)
    expect(h.some((p) => Math.round(p.x) === 1100 && Math.round(p.y) === -100)).toBe(true)
    expect(v.some((p) => Math.round(p.x) === 1100 && Math.round(p.y) === -100)).toBe(true)
  })

  it('仕様 6: つながらない単独の壁は、伸ばさない（wallPolygonsOf と同じ）', () => {
    const alone = [{ id: 'h', a: { x: 0, y: 0 }, b: { x: 1000, y: 0 }, kind: 'wall' as const }]
    expect(wallPolygonsJoined(alone, 200)).toEqual(wallPolygonsOf(alone, 200))
  })
})
