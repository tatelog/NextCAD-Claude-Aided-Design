// 仕様: PLATEAU の CityGML API の応答（https://api.plateauview.mlit.go.jp/datacatalog/citygml/mm:{メッシュ}）から、
// 区とメッシュを指定して、ファイルの項目（urf＝都市計画決定情報など）を取り出す（D-02 C4、A-03 G15、ハブ E-85）。
// 仕様 1: 応答の cities のうち、指定の区（cityCode）の、指定のメッシュ（code）の、指定の種類（urf など）のファイルを返す。
// 仕様 2: 指定の区の項目が無ければ「無い」として返す（別の区の項目を代わりに使わない）。
// 仕様 3: 同じ区の同じメッシュ・種類が二つあれば弾く（どちらか分からないため）。
// 仕様 4: 応答の形が違えば弾く（推測で読まない）。
// 注: 同じメッシュ番号は複数の区の応答に現れる（実データで確認済み。2026-11-03）。区を指定する理由はここにある。
import { describe, expect, it } from 'vitest'
import { findPlateauFile } from './catalog'

const response = {
  cities: [
    {
      cityCode: '13108',
      cityName: '江東区',
      year: 2025,
      spec: '5.0',
      url: 'https://example.invalid/13108.zip',
      files: {
        urf: [{ code: '533946', maxLod: 1, url: 'https://example.invalid/13108_533946_urf.gml', fileSize: 13854226, features: 2906 }],
      },
    },
    {
      cityCode: '13101',
      cityName: '千代田区',
      year: 2025,
      spec: '5.0',
      url: 'https://example.invalid/13101.zip',
      files: {
        urf: [{ code: '533946', maxLod: 1, url: 'https://example.invalid/13101_533946_urf.gml', fileSize: 10326909, features: 2234 }],
      },
    },
  ],
}

describe('findPlateauFile（区とメッシュを指定）', () => {
  it('指定の区・メッシュ・種類のファイルを返す', () => {
    const f = findPlateauFile(response, { cityCode: '13108', meshCode: '533946', kind: 'urf' })
    expect(f).toEqual({ status: '有', url: 'https://example.invalid/13108_533946_urf.gml', fileSize: 13854226, year: 2025, cityCode: '13108' })
  })

  it('指定の区に項目が無ければ「無い」。別の区の項目は使わない', () => {
    const r = findPlateauFile(response, { cityCode: '13116', meshCode: '533946', kind: 'urf' })
    expect(r).toEqual({ status: '無' })
  })

  it('同じ区・メッシュ・種類が二つあれば弾く', () => {
    const dup = structuredClone(response)
    dup.cities[0]!.files.urf.push({ ...dup.cities[0]!.files.urf[0]! })
    expect(() => findPlateauFile(dup, { cityCode: '13108', meshCode: '533946', kind: 'urf' })).toThrow()
  })

  it('応答の形が違えば弾く', () => {
    expect(() => findPlateauFile({ nope: true }, { cityCode: '13108', meshCode: '533946', kind: 'urf' })).toThrow()
  })
})
