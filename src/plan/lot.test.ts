// 仕様（統括の依頼 2026-11-06。P2 の斜線の基準を、P1 で選んだ筆に替える。2 件目）:
// 仕様 13: 地図で選んだ筆が無い（null）ときは、敷地はダミー（20 m × 30 m = 600 m²）を使う。
// 仕様 14: 選んだ筆があれば、その平面を敷地にする（ダミーは使わない）。
// 仕様 15: 前面道路の辺は、敷地の辺の数ぶん（0 から辺の数 − 1 まで）選べる。
// 仕様 16: 辺の番号が敷地の辺の数を超えても落ちない。範囲に収める（負・数でない値は 0）。
// 仕様 17: 筆界の注記: 選んだ筆のときは「選んだ筆」、無いときは「ダミー（20 m × 30 m）」。
// 仕様 18: 離れは敷地が軸に平行な矩形のときだけ出す。矩形でなければ「離れは矩形の敷地だけ」を出す。
// 仕様 19: 敷地の面積は敷地の多角形の面積（L 字なら実際の面積）。ダミーは 600 m²。
// 仕様 20: 周辺建物の基準点は敷地の中心（外接矩形の中心）に置く。ダミーの中心は (10 000, 15 000) mm。
import { describe, expect, it } from 'vitest'
import { lotAreaMm2, lotCenterOf, lotNoteOf, lotOf, roadEdgeIndexOf, roadEdgeOptionsOf, setbackNoteOf } from './lot'

const L_SHAPE = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 10_000 },
  { x: 10_000, y: 10_000 },
  { x: 10_000, y: 30_000 },
  { x: 0, y: 30_000 },
]
const RECT = [
  { x: -5_000, y: -10_000 },
  { x: 5_000, y: -10_000 },
  { x: 5_000, y: 10_000 },
  { x: -5_000, y: 10_000 },
]
const DIAMOND = [
  { x: 0, y: -10_000 },
  { x: 10_000, y: 0 },
  { x: 0, y: 10_000 },
  { x: -10_000, y: 0 },
]

describe('敷地（仕様 13・14）', () => {
  it('仕様 13: 筆が無い（null）ならダミーの敷地を使う', () => {
    expect(lotOf(null)).toHaveLength(4)
    expect(lotAreaMm2(lotOf(null))).toBe(600_000_000)
  })

  it('仕様 14: 選んだ筆があれば、その平面を敷地にする', () => {
    expect(lotOf(L_SHAPE)).toBe(L_SHAPE)
  })
})

describe('前面道路の辺（仕様 15・16）', () => {
  it('仕様 15: 選べる辺の番号は、敷地の辺の数ぶん（L 字は 6 辺）', () => {
    expect(roadEdgeOptionsOf(L_SHAPE)).toEqual([0, 1, 2, 3, 4, 5])
    expect(roadEdgeOptionsOf(lotOf(null))).toEqual([0, 1, 2, 3])
  })

  it('仕様 16: 辺の番号は範囲に収まる。超えたら最後の辺、負・数でない値は 0', () => {
    expect(roadEdgeIndexOf(L_SHAPE, 9)).toBe(5)
    expect(roadEdgeIndexOf(L_SHAPE, -2)).toBe(0)
    expect(roadEdgeIndexOf(L_SHAPE, Number.NaN)).toBe(0)
    expect(roadEdgeIndexOf(L_SHAPE, 3.7)).toBe(3)
    expect(roadEdgeIndexOf(lotOf(null), 3)).toBe(3)
    expect(roadEdgeIndexOf(lotOf(null), 4)).toBe(3)
  })
})

describe('注記（仕様 17・18）', () => {
  it('仕様 17: 筆界の注記は、選んだ筆とダミーで言い分ける', () => {
    expect(lotNoteOf(L_SHAPE)).toBe('筆界は選んだ筆（P1 の公図）')
    expect(lotNoteOf(null)).toBe('筆界はダミー（20 m × 30 m）')
  })

  it('仕様 18: 軸に平行な矩形の敷地は離れの注記を出さない。矩形でなければ「離れは矩形の敷地だけ」', () => {
    expect(setbackNoteOf(RECT)).toBeNull()
    expect(setbackNoteOf(lotOf(null))).toBeNull()
    expect(setbackNoteOf(L_SHAPE)).toBe('離れは矩形の敷地だけ')
    expect(setbackNoteOf(DIAMOND)).toBe('離れは矩形の敷地だけ')
  })
})

describe('面積と中心（仕様 19・20）', () => {
  it('仕様 19: 面積は多角形の実際の面積（L 字は 400 m²）', () => {
    expect(lotAreaMm2(L_SHAPE)).toBe(400_000_000)
  })

  it('仕様 20: 基準点は外接矩形の中心（ダミーは (10 000, 15 000)）', () => {
    expect(lotCenterOf(lotOf(null))).toEqual({ x: 10_000, y: 15_000 })
    expect(lotCenterOf(L_SHAPE)).toEqual({ x: 10_000, y: 15_000 })
  })
})
