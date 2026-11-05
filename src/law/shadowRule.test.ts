// 仕様: 用途地域ごとの日影規制の値（建築基準法 別表第四。出典は e-Gov 法令 API の本文、2026-11-03 取得）。
// 仕様 1: 低層住専・田園住居は、測定面 1.5 m、軒高 7 m 超（または 3 階以上）の建物が対象。
// 仕様 2: 中高層住専は、測定面 4 m（または 6.5 m）、高さ 10 m 超の建物が対象。
// 仕様 3: 住居系は、中高層住専と同じ測定面と高さの条件。
// 仕様 4: 商業系・高層住居誘導・準工業・工業は、この表の対象外または条例で別に定めるため、値を返さない（null）。
// 仕様 5: 各区分の規制時間は、（い）（ろ）（は）欄の「十メートル以内」「十メートル超」。第 2 水準（二）を既定とし、水準は引数で選ぶ。
import { describe, expect, it } from 'vitest'
import { shadowRuleFor } from './shadowRule'

describe('shadowRuleFor（用途地域ごとの日影規制の値）', () => {
  it('低層住専は測定面 1.5 m・7 m 超', () => {
    const r = shadowRuleFor('低層住専', 2)
    expect(r).not.toBeNull()
    expect(r!.measurementHeightM).toBe(1.5)
    expect(r!.minHeightMm).toBe(7_000)
  })

  it('中高層住専は測定面 4 m・10 m 超。第二水準は 4 時間（10 m 以内）と 2.5 時間（10 m 超）', () => {
    const r = shadowRuleFor('中高層住専', 2)!
    expect(r.measurementHeightM).toBe(4)
    expect(r.minHeightMm).toBe(10_000)
    expect(r.bands).toEqual([
      { maxDistanceM: 10, hours: 4 },
      { maxDistanceM: Infinity, hours: 2.5 },
    ])
  })

  it('住居系は中高層住専と同じ測定面と高さ。第一水準は 4 時間・2.5 時間（住居系の（一））', () => {
    const r = shadowRuleFor('住居系', 1)!
    expect(r.measurementHeightM).toBe(4)
    expect(r.bands[0]!.hours).toBe(4)
    expect(r.bands[1]!.hours).toBe(2.5)
  })

  // 仕様（東京都日影条例 別表第四。第三種高度地区の行は 6.5 m。江東区の全域で 第一種中高層・第一種住居・第二種住居・準住居・準工業 の第三種は 別表第四6 で 4 m）
  it('第三種高度地区で、江東区の住居系は、測定面 4 m（別表第四6）', () => {
    expect(shadowRuleFor('住居系', 2, { koudo: '第三種', ward: '江東区' })!.measurementHeightM).toBe(4)
    expect(shadowRuleFor('中高層住専', 2, { koudo: '第三種', ward: '江東区' })!.measurementHeightM).toBe(4)
  })

  it('第三種高度地区で、江東区以外の住居系は、原則の測定面 6.5 m（別表第四6の読み替えは江東区だけ）', () => {
    expect(shadowRuleFor('住居系', 2, { koudo: '第三種', ward: 'その他' })!.measurementHeightM).toBe(6.5)
  })

  it('低層住専は、高度地区の指定に関わらず測定面 1.5 m', () => {
    expect(shadowRuleFor('低層住専', 2, { koudo: '第三種', ward: '江東区' })!.measurementHeightM).toBe(1.5)
  })

  it('商業系・高層住居誘導・準工・工業・指定なしは値を返さない', () => {
    for (const z of ['商業系', '高層住居誘導', '準工・工業系', '指定なし'] as const) {
      expect(shadowRuleFor(z, 2)).toBeNull()
    }
  })
})
