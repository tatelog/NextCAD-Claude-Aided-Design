import { describe, expect, it } from 'vitest'
import { suggestMeasurement } from './shadowSuggest'

// 仕様（ハブ A-07 E-87 の東京都日影条例 別表第一。t34）から書いたテスト。
// - 候補は、人の入力（高度地区の区分）と PLATEAU の値（用途地域・容積率）から、表で決める。値は提案で、人が確認して入れる（G15）。
// - 用途地域は、表の区分に当たるものだけ（中高層住専・住居系）。ほかは決めない。
// - 容積率は PLATEAU の %（200 など）を 10 分の 1 にして、表の区分（10・15・20・30）に当てる。
// - 決められないときは、理由を返す（推測で埋めない）。

describe('測定面の候補（表から提案）', () => {
  it('中高層住専・容積率 200%・第一種は、測定面 4m（一）', () => {
    expect(suggestMeasurement({ zone: '中高層住専', farPercent: 200, heightDistrict: '第一種' })).toEqual({
      ok: true,
      measurement: { measurementM: 4, band: '一' },
    })
  })

  it('住居系・容積率 200%・第三種は、測定面 6.5m（一）', () => {
    expect(suggestMeasurement({ zone: '住居系', farPercent: 200, heightDistrict: '第三種' })).toEqual({
      ok: true,
      measurement: { measurementM: 6.5, band: '一' },
    })
  })

  it('表の区分に当たらない用途地域は、決めない（理由つき）', () => {
    expect(suggestMeasurement({ zone: '商業系', farPercent: 200, heightDistrict: '第一種' })).toEqual({
      ok: false,
      reason: '用途地域が表の区分に当たらない',
    })
  })

  it('容積率が未取得なら、決めない', () => {
    expect(suggestMeasurement({ zone: '住居系', farPercent: null, heightDistrict: '第一種' })).toEqual({
      ok: false,
      reason: '容積率が未取得',
    })
  })

  it('容積率が表の区分（10・15・20・30 の 10 分の 1）に当たらないなら、決めない', () => {
    expect(suggestMeasurement({ zone: '住居系', farPercent: 250, heightDistrict: '第一種' })).toEqual({
      ok: false,
      reason: '容積率が表の区分に当たらない',
    })
  })

  it('高度地区の区分が未入力なら、決めない', () => {
    expect(suggestMeasurement({ zone: '住居系', farPercent: 200, heightDistrict: null })).toEqual({
      ok: false,
      reason: '高度地区の区分が未入力',
    })
  })

  it('表に無い組み合わせ（中高層住専・第三種・容積率 100%）は、決めない', () => {
    expect(suggestMeasurement({ zone: '中高層住専', farPercent: 100, heightDistrict: '第三種' })).toEqual({
      ok: false,
      reason: '表に無い組み合わせ',
    })
  })
})
