// 仕様（統括の依頼 2026-11-05「3D で画面が真っ白になる」。段状の切り口の座標は斜線の交点で小数になり、押し出しの検証（整数の mm）に落ちた）:
// 仕様 1（小数の座標）: 切り口の座標が小数（斜線の交点）でも、段状の立体は作れる。例外にしない。
// 仕様 2（壊れた階は飛ばす）: 点が 3 つ未満・座標が数でない・面積が 0 の階は、立体にしない。その理由を階の番号つきで返す。残りの階は描く。
// 仕様 3（全部壊れても落ちない）: 全部の階が壊れていても、例外にせず、三角形は空。
import { describe, expect, it } from 'vitest'
import { brokenFloorsOf, floorProblemOf, stackedMesh } from './mesh'
import type { Point } from '../geom/viewport'

const H = 3000
const rect = (w: number, d: number): Point[] => [
  { x: 0, y: 0 },
  { x: w, y: 0 },
  { x: w, y: d },
  { x: 0, y: d },
]

describe('壊れた階（仕様 1〜3）', () => {
  it('仕様 1: 切り口の座標が小数でも、例外にせず立体を作る', () => {
    const fractional = [
      { x: 0.000001, y: 0 },
      { x: 9_999.5, y: 0.25 },
      { x: 9_999.5, y: 19_999.75 },
      { x: 0, y: 20_000 },
    ]
    expect(() => stackedMesh([{ footprint: fractional, heightMm: H }], H)).not.toThrow()
    expect(stackedMesh([{ footprint: fractional, heightMm: H }], H).triangles.length).toBeGreaterThan(0)
  })

  it('仕様 2: 点が 3 つ未満・座標が数でない・面積が 0 の階は、立体にせず理由を返す。残りの階は描く', () => {
    expect(floorProblemOf({ footprint: [{ x: 0, y: 0 }, { x: 1000, y: 0 }], heightMm: H }, H)).toMatch(/3 つ未満/)
    expect(floorProblemOf({ footprint: [{ x: Number.NaN, y: 0 }, { x: 1000, y: 0 }, { x: 0, y: 1000 }], heightMm: H }, H)).toMatch(/数でない/)
    expect(floorProblemOf({ footprint: [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 2000, y: 0 }], heightMm: H }, H)).toMatch(/面積が 0/)
    expect(floorProblemOf({ footprint: rect(8_000, 16_000), heightMm: 2 * H }, H)).toBeNull()

    const broken = { footprint: [{ x: 0, y: 0 }, { x: 1000, y: 0 }], heightMm: H }
    const ok = { footprint: rect(8_000, 16_000), heightMm: 2 * H }
    const m = stackedMesh([broken, ok], H)
    expect(m.triangles.length).toBeGreaterThan(0)
    // 残った階の立体は、壊れた階の分を含まない（天端の高さは残った階の 2H だけ）
    expect(new Set(m.triangles.flat().map((v) => v.z))).toEqual(new Set([H, 2 * H]))
  })

  it('仕様 3: 全部の階が壊れていても、例外にせず、三角形は空', () => {
    const broken = [{ footprint: [{ x: 0, y: 0 }], heightMm: H }, { footprint: [], heightMm: 2 * H }]
    expect(() => stackedMesh(broken, H)).not.toThrow()
    expect(stackedMesh(broken, H).triangles).toHaveLength(0)
  })

  // 仕様 22（削られた階を集める。統括の依頼 2026-11-06）: 全部削られて点が 0 の階は出さない。点が残る壊れた階は、階の番号つきで出す。
  it('仕様 22: 点が 0 の階は出さず、点が残る壊れた階は階の番号と種類つきで出す', () => {
    const floors = [
      { footprint: [], heightMm: H },
      { footprint: [{ x: 0, y: 0 }, { x: 1000, y: 0 }], heightMm: 2 * H },
      { footprint: rect(8_000, 16_000), heightMm: 3 * H },
    ]
    expect(brokenFloorsOf(floors, H)).toEqual([{ floor: 2, kind: 'fewPoints' }])
  })
})
