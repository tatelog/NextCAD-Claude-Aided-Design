// 仕様（ハブ A-03 G63・D-02 C8「躯体の数量の拾い方」）: 躯体のうち、床版（スラブ）の面積は、外形の面積 × 階数で拾う。
// 厚さと体積（コンクリート m³）と型枠・鉄筋は、拾い方が未決なので出さない。開口（階段・EV）の控除は未決なので、控除せず仮置きの印を付ける。
// 仕様 1: 床版の面積は、外形の面積 × 階数（10000 × 5000 mm、3 階 = 150 m²）。
// 仕様 2: 仮置きの印を付ける（開口の控除が未決のため）。区分は躯体。
// 仕様 3: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { structureQuantities } from './structureQuantities'

const rect = [
  { x: 0, y: 0 },
  { x: 10000, y: 0 },
  { x: 10000, y: 5000 },
  { x: 0, y: 5000 },
]

describe('床版（スラブ）の面積（仕様 1〜2）', () => {
  it('外形の面積 × 階数。10000 × 5000 mm の 3 階は 150 m²', () => {
    const q = structureQuantities(rect, { storey_count: 3, storey_height: 3000 })
    expect(q.slab.item).toBe('床版（スラブ）')
    expect(q.slab.category).toBe('躯体')
    expect(q.slab.quantity).toBeCloseTo(150, 6)
    expect(q.slab.unit).toBe('m2')
  })

  it('開口の控除は未決なので、仮置きの印を付ける', () => {
    expect(structureQuantities(rect, { storey_count: 1, storey_height: 3000 }).slab.provisional).toBe(true)
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
