// 仕様: 防火地域・高度地区の管理者（urf:custodian）で、対象の区の項目だけを残す（D-02 C4、ハブ E-82）。
// 実データ（2026-11-03、江東区のメッシュ 533946）: 用途地域（UseDistrict）の管理者はすべて「東京都」。
//   防火・高度地区の管理者は区名（江東区・江戸川区など）、「東京都」、または「Null」（無い）。ファイルは隣の区の項目も含む。
// 仕様 1: 管理者が対象の区（例: 江東区）か「東京都」の項目は残す（県の区域は全区に効く）。
// 仕様 2: 管理者が別の区の項目は捨てる（隣の区の項目を、この区の値として使わない）。
// 仕様 3: 管理者が「Null」（不明）の項目は捨てず、不明として別に返す（推測で捨てない・残さない）。
// 仕様 4: 防火・高度地区のパーサーは管理者（custodian）を読む。無ければ null。
import { describe, expect, it } from 'vitest'
import { ownedBy } from './owner'
import { parseFirePreventionDistricts, parseHeightControlDistricts } from './zones'

const ring = (lat0: number, lon0: number) => [
  { lat: lat0, lon: lon0 },
  { lat: lat0, lon: lon0 + 0.1 },
  { lat: lat0 + 0.1, lon: lon0 + 0.1 },
  { lat: lat0 + 0.1, lon: lon0 },
  { lat: lat0, lon: lon0 },
]

describe('ownedBy（管理者で絞る）', () => {
  const items = [
    { id: 'koto', custodian: '江東区', ring: ring(35, 139) },
    { id: 'edogawa', custodian: '江戸川区', ring: ring(35, 139) },
    { id: 'tokyo', custodian: '東京都', ring: ring(35, 139) },
    { id: 'unknown', custodian: null, ring: ring(35, 139) },
  ]

  it('対象の区と東京都の項目を残す。他の区は捨てる', () => {
    const r = ownedBy(items, '江東区')
    expect(r.owned.map((x) => x.id)).toEqual(['koto', 'tokyo'])
  })

  it('管理者が不明（null）の項目は、別に返す', () => {
    const r = ownedBy(items, '江東区')
    expect(r.unknownOwner.map((x) => x.id)).toEqual(['unknown'])
  })
})

describe('管理者の読み取り', () => {
  it('防火・高度地区のパーサーは custodian を読む（無ければ null）', () => {
    const fire = `<urf:FirePreventionDistrict gml:id="f"><urf:function codeSpace="x">24</urf:function><urf:custodian>江東区</urf:custodian><urf:lod1MultiSurface><gml:MultiSurface srsDimension="3"><gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>35.6 139.8 1 35.6 139.9 1 35.7 139.9 1 35.6 139.8 1</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember></gml:MultiSurface></urf:lod1MultiSurface></urf:FirePreventionDistrict>`
    expect(parseFirePreventionDistricts(fire)[0]!.custodian).toBe('江東区')
    const height = `<urf:HeightControlDistrict gml:id="h"><urf:function codeSpace="x">18</urf:function><urf:lod1MultiSurface><gml:MultiSurface srsDimension="3"><gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>35.6 139.8 1 35.6 139.9 1 35.7 139.9 1 35.6 139.8 1</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember></gml:MultiSurface></urf:lod1MultiSurface></urf:HeightControlDistrict>`
    expect(parseHeightControlDistricts(height)[0]!.custodian).toBeNull()
  })
})
