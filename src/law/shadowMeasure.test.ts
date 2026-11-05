import { describe, expect, it } from 'vitest'
import { kotoMeasurement, tokyoMeasurement } from './shadowMeasure'

// 仕様（ハブ A-07 E-87 の東京都日影条例 第3条・別表第一と別表第四、E-45 の江東区の行）から書いたテスト（t34）。
// - 測定面の高さは、用途地域・容積率・高度地区の区分で決まる（別表第一）。4m か 6.5m。
// - 表に無い組み合わせは決めない（null。推測で埋めない）。
// - 江東区は、別表第四 六 で、中高層・住居・準住居・準工業の第三種高度地区の測定面を 4m に読み替える。近隣商業は 6.5m のまま。

describe('東京都日影条例の別表第一（測定面の高さ）', () => {
  it('中高層住専は、第一種・第二種で容積率 10〜30 なら測定面 4m（一）', () => {
    expect(tokyoMeasurement({ district: '中高層住専', heightDistrict: '第一種', far: 20 })).toEqual({ measurementM: 4, band: '一' })
    expect(tokyoMeasurement({ district: '中高層住専', heightDistrict: '第二種', far: 30 })).toEqual({ measurementM: 4, band: '一' })
  })

  it('中高層住専は、第三種で容積率 20 か 30 なら測定面 6.5m（二）', () => {
    expect(tokyoMeasurement({ district: '中高層住専', heightDistrict: '第三種', far: 20 })).toEqual({ measurementM: 6.5, band: '二' })
    expect(tokyoMeasurement({ district: '中高層住専', heightDistrict: '第三種', far: 30 })).toEqual({ measurementM: 6.5, band: '二' })
  })

  it('住居・準住居は、第三種で容積率 20 なら測定面 6.5m（一）', () => {
    expect(tokyoMeasurement({ district: '住居・準住居', heightDistrict: '第三種', far: 20 })).toEqual({ measurementM: 6.5, band: '一' })
  })

  it('住居・準住居は、指定なしで容積率 30 なら測定面 4m（二）、10 なら 4m（一）', () => {
    expect(tokyoMeasurement({ district: '住居・準住居', heightDistrict: '指定なし', far: 30 })).toEqual({ measurementM: 4, band: '二' })
    expect(tokyoMeasurement({ district: '住居・準住居', heightDistrict: '指定なし', far: 10 })).toEqual({ measurementM: 4, band: '一' })
  })

  it('近隣商業は、第三種で容積率 20 なら 6.5m（一）、30 なら 6.5m（二）', () => {
    expect(tokyoMeasurement({ district: '近隣商業', heightDistrict: '第三種', far: 20 })).toEqual({ measurementM: 6.5, band: '一' })
    expect(tokyoMeasurement({ district: '近隣商業', heightDistrict: '第三種', far: 30 })).toEqual({ measurementM: 6.5, band: '二' })
  })

  it('準工業は、指定なしで容積率 20 なら 4m（二）、第二種で 30 なら 4m（一）', () => {
    expect(tokyoMeasurement({ district: '準工業', heightDistrict: '指定なし', far: 20 })).toEqual({ measurementM: 4, band: '二' })
    expect(tokyoMeasurement({ district: '準工業', heightDistrict: '第二種', far: 30 })).toEqual({ measurementM: 4, band: '一' })
  })

  it('表に無い組み合わせ（中高層住専・第三種・容積率 10）は決めない（null）', () => {
    expect(tokyoMeasurement({ district: '中高層住専', heightDistrict: '第三種', far: 10 })).toBeNull()
  })

  it('表に無い組み合わせ（準工業・第一種・容積率 30）は決めない（null）', () => {
    expect(tokyoMeasurement({ district: '準工業', heightDistrict: '第一種', far: 30 })).toBeNull()
  })
})

describe('江東区（別表第四 六）の測定面', () => {
  it('準工業の第三種は、江東区では 4m に読み替える', () => {
    expect(kotoMeasurement({ district: '準工業', heightDistrict: '第三種', far: 30 })).toEqual({ measurementM: 4, band: '二' })
  })

  it('近隣商業の第三種は、江東区でも 6.5m のまま', () => {
    expect(kotoMeasurement({ district: '近隣商業', heightDistrict: '第三種', far: 20 })).toEqual({ measurementM: 6.5, band: '一' })
  })

  it('読み替えは第三種だけ。第二種の 4m はそのまま 4m', () => {
    expect(kotoMeasurement({ district: '中高層住専', heightDistrict: '第二種', far: 20 })).toEqual({ measurementM: 4, band: '一' })
  })

  it('表に無い組み合わせは、江東区でも決めない（null）', () => {
    expect(kotoMeasurement({ district: '準工業', heightDistrict: '第一種', far: 30 })).toBeNull()
  })
})
