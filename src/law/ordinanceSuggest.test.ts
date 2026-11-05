// 仕様（ハブ A-03 G15・D-02 C4「条例の補完の出力（W4）」）: Claude が条例本文から補った値は、そのまま判定に使わず、人が確認するまで未確認にする。
// 仕様 1: 項目は、日影の三項目（10 m 以内・10 m 超・測定面の高さ）のどれかだけ。ほかの名前の項目は捨てる。
// 仕様 2: 出典（条例名と条項）が空の項目は採らない（出典のない値は採らない）。
// 仕様 3: 値は数（「4時間」「4 m」「2.5」など）で入るものだけ採る。「約4時間」などは採らない。
// 仕様 4: 採った項目は、確認済みの印を持たない（人が確認するまで未確認）。
// 仕様 5: 採った数と捨てた数を返す（捨てた数を人に見せるため）。形が配列でないときは、何も採らず 0 件。
// 仕様 6: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { acceptSuggestions } from './ordinanceSuggest'
import { SHADOW_KEYS } from './shadowOrdinance'

const good = { item: SHADOW_KEYS.near, value: '4時間', source: '東京都条例 別表第四' }

describe('W4 の出力の検証（仕様 1〜5）', () => {
  it('仕様 1: 日影の三項目だけを採り、ほかの名前の項目は捨てる', () => {
    const r = acceptSuggestions([good, { item: '高度地区の勾配', value: '1/2', source: '条例 第3条' }])
    expect(r.accepted).toEqual([{ key: SHADOW_KEYS.near, value: '4時間', source: '東京都条例 別表第四' }])
    expect(r.dropped).toBe(1)
  })

  it('仕様 2: 出典が空、または空白だけの項目は採らない', () => {
    const r = acceptSuggestions([
      { ...good, source: '' },
      { ...good, source: '   ' },
    ])
    expect(r.accepted).toEqual([])
    expect(r.dropped).toBe(2)
  })

  it('仕様 3: 値が数でないものは採らない。数の表記（4、4時間、4 m、2.5 m）は採る', () => {
    const r = acceptSuggestions([
      { ...good, value: '約4時間' },
      { ...good, item: SHADOW_KEYS.height, value: '4 m' },
      { ...good, item: SHADOW_KEYS.far, value: '2.5' },
    ])
    expect(r.accepted.map((a) => a.value)).toEqual(['4 m', '2.5'])
    expect(r.dropped).toBe(1)
  })

  it('仕様 4: 採った項目は確認済みの印を持たない（人が確認するまで未確認）', () => {
    const r = acceptSuggestions([good])
    expect(r.accepted[0]).not.toHaveProperty('confirmed')
  })

  it('仕様 5: 形が配列でなければ、何も採らず 0 件', () => {
    expect(acceptSuggestions(undefined)).toEqual({ accepted: [], dropped: 0 })
    expect(acceptSuggestions('not a list')).toEqual({ accepted: [], dropped: 0 })
  })
})

describe('同じ入力（仕様 6）', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const input = [good, { ...good, source: '' }]
    const before = JSON.stringify(input)
    expect(acceptSuggestions(input)).toEqual(acceptSuggestions(input))
    expect(JSON.stringify(input)).toBe(before)
  })
})
