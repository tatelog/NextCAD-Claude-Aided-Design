// 仕様（ハブ A-03 G4・D-02 C3「2D 図形の生成規則」）: 壁は中心線から両側に壁厚の半分ずつ広げた輪郭で描く。
// 仕様 1: 直線の壁（a → b）の輪郭は、中心線の両側に厚さの半分ずつの四角形（4 点）。
// 仕様 2: 長さ 0 の線は、輪郭を出さない（空の配列）。
// 仕様 3: 壁の線だけを輪郭にする（種類が wall の線）。種類の無い線・ほかの種類は出さない。
// 仕様 4: 入力を書き換えず、同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { wallPolygonsOf, wallRectOf } from './wallOutline'

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
