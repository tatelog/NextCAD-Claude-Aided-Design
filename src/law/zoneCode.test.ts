// 仕様: PLATEAU の urf:function（用途地域の区分コード。Common_districtsAndZonesType、2026-11-03 に MLIT のコードリストで確認）を、斜線の規則の区分（Zone）に写す。
// コード 0 = 用途地域の指定をしない区域、1 = 第1種低層住居専用、2 = 第2種低層、3 = 第1種中高層、4 = 第2種中高層、5 = 第1種住居、6 = 第2種住居、
// 7 = 準住居、8 = 田園住居、9 = 近隣商業、10 = 商業、11 = 準工業、12 = 工業、13 = 工業専用。
// 仕様 1: 1・2 は低層住専、3・4 は中高層住専、5・6・7 は住居系、8 は田園住居、9・10 は商業系、11・12・13 は準工・工業系、0 は指定なし。
// 仕様 2: 高層住居誘導地区は urf のコードに無い（別の地区）ので、ここからは作らない。
// 仕様 3: 知らないコードは弾く（推測で写さない）。
import { describe, expect, it } from 'vitest'
import { zoneFromUrfFunction } from './zoneCode'

describe('zoneFromUrfFunction（コード → 斜線の区分）', () => {
  it('低層・中高層・住居系・田園住居', () => {
    expect(zoneFromUrfFunction(1)).toBe('低層住専')
    expect(zoneFromUrfFunction(2)).toBe('低層住専')
    expect(zoneFromUrfFunction(3)).toBe('中高層住専')
    expect(zoneFromUrfFunction(4)).toBe('中高層住専')
    expect(zoneFromUrfFunction(5)).toBe('住居系')
    expect(zoneFromUrfFunction(6)).toBe('住居系')
    expect(zoneFromUrfFunction(7)).toBe('住居系')
    expect(zoneFromUrfFunction(8)).toBe('田園住居')
  })

  it('商業・準工・工業・指定なし', () => {
    expect(zoneFromUrfFunction(9)).toBe('商業系')
    expect(zoneFromUrfFunction(10)).toBe('商業系')
    expect(zoneFromUrfFunction(11)).toBe('準工・工業系')
    expect(zoneFromUrfFunction(12)).toBe('準工・工業系')
    expect(zoneFromUrfFunction(13)).toBe('準工・工業系')
    expect(zoneFromUrfFunction(0)).toBe('指定なし')
  })

  it('知らないコードは弾く', () => {
    expect(() => zoneFromUrfFunction(14)).toThrow()
    expect(() => zoneFromUrfFunction(-1)).toThrow()
  })
})
