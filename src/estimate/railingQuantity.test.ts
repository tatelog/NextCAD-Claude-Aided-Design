// 仕様（ハブ A-03 G62・D-02 C8「数量の拾い方」）: 外装の手すりは、バルコニーが外周に接する面の辺の長さ × 手すりの高さ（仮置き 1100 mm）で面積を拾う。
// 仕様 1: 手すりの面積は、バルコニーの付く面（外周に接する面）の辺の長さ × 高さ（1100 mm）の合計 × 階数。
// 仕様 2: 外周に接しない区画は 0。仮置きの印（provisional）を付ける。
// 仕様 3: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { railingQuantity, RAILING_HEIGHT_MM } from './planExterior'
import type { Rect } from '../plan/candidateCells'

describe('手すりの面積（仕様 1〜2）', () => {
  it('外周に接する下の面の辺 6000 mm × 手すり 1100 mm = 6.6 m²。2 階で 13.2 m²', () => {
    const cells: Rect[] = [{ id: 'u1', x0: 0, y0: 6000, x1: 6000, y1: 10000 }]
    const q = railingQuantity({ cells, outline: { W: 6000, D: 10000 }, storeyCount: 2 })
    expect(RAILING_HEIGHT_MM).toBe(1100)
    expect(q.item).toBe('手すり')
    expect(q.category).toBe('外装')
    expect(q.quantity).toBeCloseTo(13.2, 6)
    expect(q.provisional).toBe(true)
  })

  it('外周に接しない区画は 0', () => {
    const cells: Rect[] = [{ id: 'u2', x0: 0, y0: 0, x1: 6000, y1: 3000 }]
    expect(railingQuantity({ cells, outline: { W: 6000, D: 10000 }, storeyCount: 2 }).quantity).toBe(0)
  })
})

describe('同じ入力（仕様 3）', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const cells: Rect[] = [{ id: 'u1', x0: 0, y0: 6000, x1: 6000, y1: 10000 }]
    const before = JSON.stringify(cells)
    const input = { cells, outline: { W: 6000, D: 10000 }, storeyCount: 2 }
    expect(railingQuantity(input)).toEqual(railingQuantity(input))
    expect(JSON.stringify(cells)).toBe(before)
  })
})
