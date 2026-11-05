// 仕様（統括の t68・2026-11-05。名前は PLATEAU の公開のコードリストで確認（2026-11-05））:
// 仕様 1（区分）: 用途地域の区分コード（Common_districtsAndZonesType）を名前で出す。1〜13 は用途地域、18 は高度地区、24 は防火地域、25 は準防火地域。
// 仕様 2（用途）: 防火の用途コード（FirePreventionDistrict_usage）を名前で出す。1 防火地域（地域）、2 防火地域（路線）、3 準防火地域（地域）、4 準防火地域（路線）。
// 仕様 3（知らないコード）: 表に無いコードは名前を返さない（推測で埋めない）。
import { describe, expect, it } from 'vitest'
import { districtsAndZonesName, fireUsageName } from './codelist'

describe('区分コードの名前（仕様 1・3）', () => {
  it('用途地域（1〜13）の名前。11 は準工業地域', () => {
    expect(districtsAndZonesName(1)).toBe('第1種低層住居専用地域')
    expect(districtsAndZonesName(11)).toBe('準工業地域')
    expect(districtsAndZonesName(13)).toBe('工業専用地域')
  })

  it('高度地区（18）・防火地域（24）・準防火地域（25）', () => {
    expect(districtsAndZonesName(18)).toBe('高度地区')
    expect(districtsAndZonesName(24)).toBe('防火地域')
    expect(districtsAndZonesName(25)).toBe('準防火地域')
  })

  it('表に無いコードは undefined', () => {
    expect(districtsAndZonesName(99)).toBeUndefined()
  })
})

describe('防火の用途の名前（仕様 2・3）', () => {
  it('1〜4 の名前', () => {
    expect(fireUsageName(1)).toBe('防火地域（地域）')
    expect(fireUsageName(2)).toBe('防火地域（路線）')
    expect(fireUsageName(3)).toBe('準防火地域（地域）')
    expect(fireUsageName(4)).toBe('準防火地域（路線）')
  })

  it('表に無いコードは undefined', () => {
    expect(fireUsageName(5)).toBeUndefined()
  })
})
