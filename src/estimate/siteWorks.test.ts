// 仕様（ハブ A-03 G63・D-02 C8「外構の拾い方」）: 外構の面積は、敷地の面積から建物の建築面積を引いた、建物以外の部分とする（仮置き）。
// 舗装・植栽などの内訳は拾い方が未決なので分けない。敷地は仮置き（P1 の筆界が入るまでのダミー）なので、仮置きの印を付ける。
// 仕様 1: 外構 = 敷地の面積 − 建築面積。敷地 600 m²、建築面積 50 m² なら 550 m²。
// 仕様 2: 建築面積が敷地より大きいときは 0（負の面積を出さない）。
// 仕様 3: 区分は外構、単位は m²、仮置きの印（provisional）を付ける。
// 仕様 4: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { siteWorksQuantity } from './siteWorks'

const parcelMm2 = 600_000_000
const footprint = [
  { x: 0, y: 0 },
  { x: 10000, y: 0 },
  { x: 10000, y: 5000 },
  { x: 0, y: 5000 },
]

describe('外構の面積（仕様 1〜3）', () => {
  it('敷地 600 m² − 建築面積 50 m² = 550 m²。区分は外構、単位は m²、仮置きの印を付ける', () => {
    const q = siteWorksQuantity(parcelMm2, footprint)
    expect(q.item).toBe('外構（建物以外の敷地）')
    expect(q.category).toBe('外構')
    expect(q.unit).toBe('m2')
    expect(q.quantity).toBeCloseTo(550, 6)
    expect(q.provisional).toBe(true)
  })

  it('建築面積が敷地より大きいときは 0', () => {
    expect(siteWorksQuantity(1_000_000, footprint).quantity).toBe(0)
  })
})

describe('同じ入力（仕様 4）', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const before = JSON.stringify(footprint)
    expect(siteWorksQuantity(parcelMm2, footprint)).toEqual(siteWorksQuantity(parcelMm2, footprint))
    expect(JSON.stringify(footprint)).toBe(before)
  })
})
