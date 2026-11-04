// 仕様（ハブ A-03 G63・D-02 C8「躯体の数量の拾い方」）: 躯体の型枠のうち、床版の下面の型枠は、床版の面積と同じ（外形の面積 × 階数）。
// 型枠は面積（m²）で拾う。開口（階段・EV）の控除は未決なので、控除せず仮置きの印を付ける。
// 仕様 1: 型枠（床版の下面）の面積は、床版の面積と同じ。10000 × 5000 mm、3 階で 150 m²。
// 仕様 2: 区分は躯体。仮置きの印（provisional）を付ける。
// 仕様 3: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { structureQuantities } from './structureQuantities'

const rect = [
  { x: 0, y: 0 },
  { x: 10000, y: 0 },
  { x: 10000, y: 5000 },
  { x: 0, y: 5000 },
]

describe('床版の下面の型枠（仕様 1〜2）', () => {
  it('型枠の面積は床版の面積と同じ（150 m²）。区分は躯体、仮置きの印を付ける', () => {
    const q = structureQuantities(rect, { storey_count: 3, storey_height: 3000 })
    expect(q.formwork.item).toBe('型枠（床版の下面）')
    expect(q.formwork.category).toBe('躯体')
    expect(q.formwork.unit).toBe('m2')
    expect(q.formwork.quantity).toBeCloseTo(q.slab.quantity, 6)
    expect(q.formwork.quantity).toBeCloseTo(150, 6)
    expect(q.formwork.provisional).toBe(true)
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
