// 仕様（ハブ A-03 G63・D-02 C8「躯体の数量の拾い方」）: 床版のコンクリートの体積は、床版の面積 × 床版の厚さ × 階数で拾う（m³）。
// 床版の厚さは出典が無いので仮置き（既定 150 mm）。仮置きの印を付ける。鉄筋と外構は、拾い方が未決なので含めない。
// 仕様 1: 体積 = 外形の面積 × 厚さ × 階数。10000 × 5000 mm（50 m²）、厚さ 150 mm、3 階で 22.5 m³。
// 仕様 2: 区分は躯体、単位は m³、仮置きの印（provisional）を付ける。
// 仕様 3: 厚さは引数で変えられる。
// 仕様 4: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { structureQuantities, SLAB_THICKNESS_MM } from './structureQuantities'

const rect = [
  { x: 0, y: 0 },
  { x: 10000, y: 0 },
  { x: 10000, y: 5000 },
  { x: 0, y: 5000 },
]

describe('床版のコンクリートの体積（仕様 1〜2）', () => {
  it('50 m² × 0.15 m × 3 階 = 22.5 m³。区分は躯体、単位は m3、仮置きの印を付ける', () => {
    expect(SLAB_THICKNESS_MM).toBe(150)
    const q = structureQuantities(rect, { storey_count: 3, storey_height: 3000 })
    expect(q.concrete.item).toBe('コンクリート（床版）')
    expect(q.concrete.category).toBe('躯体')
    expect(q.concrete.unit).toBe('m3')
    expect(q.concrete.quantity).toBeCloseTo(22.5, 6)
    expect(q.concrete.provisional).toBe(true)
  })
})

describe('厚さの引数（仕様 3）', () => {
  it('厚さを 200 mm にすると、50 m² × 0.2 m × 3 階 = 30 m³', () => {
    const q = structureQuantities(rect, { storey_count: 3, storey_height: 3000 }, 200)
    expect(q.concrete.quantity).toBeCloseTo(30, 6)
  })
})

describe('同じ入力（仕様 4）', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const input = [...rect]
    const before = JSON.stringify(input)
    const storeys = { storey_count: 2, storey_height: 3000 }
    expect(structureQuantities(input, storeys)).toEqual(structureQuantities(input, storeys))
    expect(JSON.stringify(input)).toBe(before)
  })
})
