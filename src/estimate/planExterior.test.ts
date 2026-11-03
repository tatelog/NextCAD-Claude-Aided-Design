// 仕様（ハブ A-03 G62・D-02 C8「数量の拾い方」）: 外装のうち、バルコニーと共用廊下は、P3 の自動作成の結果（基準階の区画・廊下・コア）から拾う。
// 仕様 1: 共用廊下の面積は、廊下の矩形から、廊下と重なる階段・EV（コア）の面積を引いたもの。外にはみ出した分は引かない。
// 仕様 2: バルコニーの面積は、外周に接する面（既定は下）の辺の長さ × 奥行（既定 1600 mm）の合計。外周に接しない区画は 0。
// 仕様 3: 基準階の面積に階数を掛けた数量を出す。仮置きなので、未確定の印（provisional）を付ける。
// 仕様 4: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { planExteriorQuantities } from './planExterior'
import type { Rect } from '../plan/candidateCells'

const corridor: Rect = { id: 'corridor', x0: 0, y0: 0, x1: 2000, y1: 10000 }

describe('共用廊下（仕様 1）', () => {
  it('廊下の矩形から、重なる階段・EV の面積を引く（20 m² から 12 m² を引いて 8 m²）', () => {
    const cores: Rect[] = [
      { id: 'stairA', x0: 0, y0: 0, x1: 2000, y1: 3000 },
      { id: 'stairB', x0: 0, y0: 7000, x1: 2000, y1: 10000 },
    ]
    const q = planExteriorQuantities({ corridor, cores, cells: [], outline: { W: 4000, D: 10000 }, storeyCount: 1 })
    expect(q.corridor.item).toBe('共用廊下')
    expect(q.corridor.quantity).toBeCloseTo(8, 6)
  })

  it('廊下の外にはみ出したコアの分は引かない（重なる部分だけ 2 m² を引く）', () => {
    const cores: Rect[] = [{ id: 'ev', x0: -1000, y0: 0, x1: 1000, y1: 2000 }]
    const q = planExteriorQuantities({ corridor, cores, cells: [], outline: { W: 4000, D: 10000 }, storeyCount: 1 })
    expect(q.corridor.quantity).toBeCloseTo(18, 6)
  })
})

describe('バルコニー（仕様 2）', () => {
  it('外周に接する下の面は、辺の長さ 6000 mm × 奥行 1600 mm = 9.6 m²。外周に接しない区画は 0', () => {
    const cells: Rect[] = [
      { id: 'u1', x0: 0, y0: 6000, x1: 6000, y1: 10000 },
      { id: 'u2', x0: 0, y0: 0, x1: 6000, y1: 3000 },
    ]
    const q = planExteriorQuantities({ corridor, cores: [], cells, outline: { W: 6000, D: 10000 }, storeyCount: 1 })
    expect(q.balcony.item).toBe('バルコニー')
    expect(q.balcony.quantity).toBeCloseTo(9.6, 6)
  })
})

describe('階数と仮置きの印（仕様 3）', () => {
  it('基準階の面積に階数を掛け、仮置きの印を付ける', () => {
    const cells: Rect[] = [{ id: 'u1', x0: 0, y0: 6000, x1: 6000, y1: 10000 }]
    const q = planExteriorQuantities({ corridor, cores: [], cells, outline: { W: 6000, D: 10000 }, storeyCount: 2 })
    expect(q.balcony.quantity).toBeCloseTo(19.2, 6)
    expect(q.corridor.quantity).toBeCloseTo(40, 6)
    expect(q.balcony.provisional).toBe(true)
    expect(q.corridor.provisional).toBe(true)
  })
})

describe('同じ入力（仕様 4）', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const cells: Rect[] = [{ id: 'u1', x0: 0, y0: 6000, x1: 6000, y1: 10000 }]
    const input = { corridor, cores: [], cells, outline: { W: 6000, D: 10000 }, storeyCount: 2 }
    const before = JSON.stringify(input)
    expect(planExteriorQuantities(input)).toEqual(planExteriorQuantities(input))
    expect(JSON.stringify(input)).toBe(before)
  })
})
