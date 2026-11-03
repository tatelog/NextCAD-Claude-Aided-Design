// 仕様: 数量の自動拾い（P4）。P2 の外形から拾った数量を、単価の行（品目名が一致）に入れる。
// 仕様 1: 手で入れた数量があれば、それを使う（手入力が優先）。
// 仕様 2: 手入力が空で、品目名が一致する自動の数量があれば、その数量を使い「自動」と分かるようにする。
// 仕様 3: どちらも無ければ null（推測で数量を入れない）。
// 仕様 4: 品目名は完全一致だけで結ぶ（部分一致や似た名前では結ばない）。
import { describe, expect, it } from 'vitest'
import { effectiveQuantity } from './autoQuantity'

const auto = [
  { item: '外壁仕上げ', quantity: 2140 },
  { item: '屋根防水', quantity: 240 },
]

describe('effectiveQuantity（手入力と自動の数量）', () => {
  it('手入力があれば手入力を使う', () => {
    expect(effectiveQuantity({ item: '屋根防水' }, '300', auto)).toEqual({ quantity: 300, source: '手入力' })
  })

  it('手入力が空で、品目名が一致する自動の数量があれば自動を使う', () => {
    expect(effectiveQuantity({ item: '屋根防水' }, '', auto)).toEqual({ quantity: 240, source: '自動' })
  })

  it('どちらも無ければ null', () => {
    expect(effectiveQuantity({ item: '舗装' }, '', auto)).toBeNull()
  })

  it('品目名は完全一致だけで結ぶ（外壁タイル は 外壁仕上げ と結ばない）', () => {
    expect(effectiveQuantity({ item: '外壁タイル' }, '', auto)).toBeNull()
  })
})
