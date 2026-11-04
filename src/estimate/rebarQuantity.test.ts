// 仕様（ハブ A-03 G63・D-02 C8「躯体の数量の拾い方」）: 床版の鉄筋の量は、床版のコンクリートの体積 × 鉄筋量（t/m³）で拾う。
// 鉄筋量は出典が無いので仮置き（既定 0.1 t/m³）。仮置きの印を付ける。外構は拾い方が未決なので含めない。
// 仕様 1: 鉄筋の量 = コンクリートの体積 × 0.1 t/m³。22.5 m³ なら 2.25 t。
// 仕様 2: 区分は躯体、単位は t、仮置きの印（provisional）を付ける。
// 仕様 3: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { structureQuantities, REBAR_T_PER_M3 } from './structureQuantities'

const rect = [
  { x: 0, y: 0 },
  { x: 10000, y: 0 },
  { x: 10000, y: 5000 },
  { x: 0, y: 5000 },
]

describe('床版の鉄筋の量（仕様 1〜2）', () => {
  it('コンクリート 22.5 m³ × 0.1 t/m³ = 2.25 t。区分は躯体、単位は t、仮置きの印を付ける', () => {
    expect(REBAR_T_PER_M3).toBeCloseTo(0.1, 6)
    const q = structureQuantities(rect, { storey_count: 3, storey_height: 3000 })
    expect(q.rebar.item).toBe('鉄筋（床版）')
    expect(q.rebar.category).toBe('躯体')
    expect(q.rebar.unit).toBe('t')
    expect(q.rebar.quantity).toBeCloseTo(2.25, 6)
    expect(q.rebar.provisional).toBe(true)
  })
})

describe('同じ入力（仕様 3）', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const input = [...rect]
    const before = JSON.stringify(input)
    const storeys = { storey_count: 2, storey_height: 3000 }
    expect(structureQuantities(input, storeys)).toEqual(structureQuantities(input, storeys))
    expect(JSON.stringify(input)).toBe(before)
  })
})
