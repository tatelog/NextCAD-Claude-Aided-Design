// 仕様（統括の依頼 2026-11-05、t29。ハブ A-07 E-87・E-45、都条例 別表第四 六）:
// 仕様 1（規制値の基準）: 第三種高度地区のとき、江東区の中高層・住居系は測定面 4 m、ほかの区は 6.5 m。文脈が無いときは従来どおり 4 m。
// 仕様 2（候補）: 測定面の候補（表から出す提案）も、江東区の読み替え（第三種 4 m）を使う。他の区・文脈なしは従来の表（6.5 m）。
// 仕様 3（判定）: 判定の測定面は、人が確認した条例の値を使う。文脈（高度地区・区）で変わらない。
// 仕様 4（対象外）: 近隣商業は対象外。区の読み替えの対象にもならない。
// 仕様 5（区）: 製品の範囲の区は江東区（AGENTS.md・README）。
import { describe, expect, it } from 'vitest'
import { PROJECT_WARD, shadowRuleFor } from './shadowRule'
import { suggestMeasurement } from './shadowSuggest'
import { SHADOW_KEYS, shadowRuleFromOrdinance } from './shadowOrdinance'
import type { OrdinanceEntry } from './ordinance'

const confirmed = (key: string, value: string): OrdinanceEntry => ({ key, value, source: '都条例 別表第三', confirmed: true })

describe('規制値の基準（仕様 1）', () => {
  it('第三種高度地区の江東区は住居系・中高層で 4 m、ほかの区は 6.5 m。文脈が無ければ 4 m', () => {
    expect(shadowRuleFor('住居系', 2, { koudo: '第三種', ward: '江東区' })?.measurementHeightM).toBe(4)
    expect(shadowRuleFor('住居系', 2, { koudo: '第三種', ward: 'その他' })?.measurementHeightM).toBe(6.5)
    expect(shadowRuleFor('住居系', 2)?.measurementHeightM).toBe(4)
    expect(shadowRuleFor('中高層住専', 2, { koudo: '第三種', ward: '江東区' })?.measurementHeightM).toBe(4)
    expect(shadowRuleFor('中高層住専', 2, { koudo: '第三種', ward: 'その他' })?.measurementHeightM).toBe(6.5)
  })

  it('第三種でなければ、区に関わらず 4 m', () => {
    expect(shadowRuleFor('住居系', 2, { koudo: 'その他', ward: 'その他' })?.measurementHeightM).toBe(4)
  })
})

describe('測定面の候補（仕様 2）', () => {
  it('江東区の第三種は 4 m（住居系・中高層）。他の区と文脈なしは表の 6.5 m', () => {
    expect(suggestMeasurement({ zone: '住居系', farPercent: 200, heightDistrict: '第三種', ward: '江東区' })).toEqual({
      ok: true,
      measurement: { measurementM: 4, band: '一' },
    })
    expect(suggestMeasurement({ zone: '中高層住専', farPercent: 200, heightDistrict: '第三種', ward: '江東区' })).toEqual({
      ok: true,
      measurement: { measurementM: 4, band: '二' },
    })
    expect(suggestMeasurement({ zone: '住居系', farPercent: 200, heightDistrict: '第三種', ward: 'その他' })).toEqual({
      ok: true,
      measurement: { measurementM: 6.5, band: '一' },
    })
    expect(suggestMeasurement({ zone: '住居系', farPercent: 200, heightDistrict: '第三種' })).toEqual({
      ok: true,
      measurement: { measurementM: 6.5, band: '一' },
    })
  })
})

describe('判定の測定面（仕様 3）', () => {
  it('判定の測定面は、確認済みの条例の値。文脈が変わっても同じ', () => {
    const entries = [confirmed(SHADOW_KEYS.near, '4'), confirmed(SHADOW_KEYS.far, '2.5'), confirmed(SHADOW_KEYS.height, '6.5')]
    const a = shadowRuleFromOrdinance('住居系', entries, { koudo: '第三種', ward: '江東区' })
    const b = shadowRuleFromOrdinance('住居系', entries, { koudo: '第三種', ward: 'その他' })
    expect(a).toEqual(b)
    if (a.ok) expect(a.rule.measurementHeightM).toBe(6.5)
  })
})

describe('対象外と区（仕様 4・5）', () => {
  it('近隣商業は対象外（規制値も候補も出ない）', () => {
    expect(shadowRuleFor('商業系', 2, { koudo: '第三種', ward: '江東区' })).toBeNull()
    expect(suggestMeasurement({ zone: '近隣商業', farPercent: 200, heightDistrict: '第三種', ward: '江東区' }).ok).toBe(false)
  })

  it('製品の範囲の区は江東区', () => {
    expect(PROJECT_WARD).toBe('江東区')
  })
})
