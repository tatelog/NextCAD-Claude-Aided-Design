// 仕様（ハブ A-03 G62・D-02 C8「数量の拾い方」）: 外装のサッシは、開口として意味づけした線の長さ × 高さで面積を拾う。
// 高さは決まっていないので、仮置き（既定 1200 mm。出典なし）として印を付ける。
// 仕様 1: 種類が開口の線だけを数える。壁・柱など、ほかの種類の線は数えない。
// 仕様 2: 面積は、開口の線の長さ（mm）の合計 × 高さ（mm）を m² にしたもの。
// 仕様 3: 開口が無ければ 0。仮置きの印（provisional）を付ける。高さは引数で変えられる。
// 仕様 4: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { sashQuantity } from './sashQuantity'

const segs = [
  { id: 'w1', x1: 0, y1: 0, x2: 2000, y2: 0 },
  { id: 'o1', x1: 500, y1: 0, x2: 1500, y2: 0 },
  { id: 'o2', x1: 0, y1: 1000, x2: 0, y2: 3000 },
]
const kinds: Record<string, string> = { w1: 'wall', o1: 'opening', o2: 'opening' }
const kindOf = (id: string) => kinds[id] ?? null

describe('サッシの面積（仕様 1〜2）', () => {
  it('開口の線（1000 mm と 2000 mm）の長さの合計 3000 mm × 仮置きの高さ 1200 mm = 3.6 m²', () => {
    const q = sashQuantity(segs, kindOf)
    expect(q.item).toBe('サッシ')
    expect(q.category).toBe('外装')
    expect(q.quantity).toBeCloseTo(3.6, 6)
    expect(q.unit).toBe('m2')
  })
})

describe('開口が無い・仮置きの印（仕様 3）', () => {
  it('開口が無ければ 0。仮置きの印を付ける。高さは引数で変えられる', () => {
    expect(sashQuantity(segs, () => 'wall').quantity).toBe(0)
    expect(sashQuantity(segs, kindOf).provisional).toBe(true)
    expect(sashQuantity(segs, kindOf, 2000).quantity).toBeCloseTo(6, 6)
  })
})

describe('同じ入力（仕様 4）', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const before = JSON.stringify(segs)
    expect(sashQuantity(segs, kindOf)).toEqual(sashQuantity(segs, kindOf))
    expect(JSON.stringify(segs)).toBe(before)
  })
})
