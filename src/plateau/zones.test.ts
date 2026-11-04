// 仕様: PLATEAU の urf の防火地域（urf:FirePreventionDistrict）と高度地区（urf:HeightControlDistrict）の解析（D-02 C4・C11、A-03 G28、ハブ E-80・E-82）。
// 実データの構造（2026-11-03、江東区のメッシュ 533946）:
//   防火: urf:function（24 = 防火地域、25 = 準防火地域）、urf:usage（1 防火地域（地域）、2 防火地域（路線）、3 準防火地域（地域）、4 準防火地域（路線））、告示番号、範囲。
//   高度: urf:function（18 = 高度地区）、urf:maximumBuildingHeight（m。241 件）、urf:minimumBuildingHeight（m。89 件）、告示番号、範囲。
// 仕様 1: 防火地域は区分（防火地域／準防火地域）と用途（地域／路線）に分けて返す。知らない用途コードは弾く。
// 仕様 2: 高度地区は最高・最低の高さ（m）を返す。無ければ null（推測で埋めない）。
// 仕様 3: 地点を含むものだけを返す（境界上は含めない）。
import { describe, expect, it } from 'vitest'
import { parseFirePreventionDistricts, parseHeightControlDistricts, fireKind, districtsAtPoint } from './zones'

const fire = `
<urf:FirePreventionDistrict gml:id="f1">
  <urf:function codeSpace="x">24</urf:function>
  <urf:usage codeSpace="x">2</urf:usage>
  <urf:notificationNumber>江東区告示第157号</urf:notificationNumber>
  <urf:lod1MultiSurface><gml:MultiSurface srsDimension="3"><gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>
    35.60 139.80 10 35.60 139.90 10 35.70 139.90 10 35.70 139.80 10 35.60 139.80 10
  </gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember></gml:MultiSurface></urf:lod1MultiSurface>
</urf:FirePreventionDistrict>`

const height = `
<urf:HeightControlDistrict gml:id="h1">
  <urf:function codeSpace="x">18</urf:function>
  <urf:maximumBuildingHeight uom="m">14</urf:maximumBuildingHeight>
  <urf:notificationNumber>江東区告示第1号</urf:notificationNumber>
  <urf:lod1MultiSurface><gml:MultiSurface srsDimension="3"><gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>
    35.60 139.80 10 35.60 139.90 10 35.70 139.90 10 35.70 139.80 10 35.60 139.80 10
  </gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember></gml:MultiSurface></urf:lod1MultiSurface>
</urf:HeightControlDistrict>`

describe('防火地域', () => {
  it('区分・用途・告示番号・範囲を取り出す', () => {
    const d = parseFirePreventionDistricts(fire)
    expect(d[0]).toMatchObject({ id: 'f1', function: 24, usage: 2, notificationNumber: '江東区告示第157号' })
    expect(d[0]!.ring).toHaveLength(5)
  })

  it('用途コードを区分（防火・準防火）と用途（地域・路線）に分ける', () => {
    expect(fireKind(1)).toEqual({ kind: '防火地域', scope: '地域' })
    expect(fireKind(2)).toEqual({ kind: '防火地域', scope: '路線' })
    expect(fireKind(3)).toEqual({ kind: '準防火地域', scope: '地域' })
    expect(fireKind(4)).toEqual({ kind: '準防火地域', scope: '路線' })
    expect(() => fireKind(5)).toThrow()
  })
})

describe('高度地区', () => {
  it('最高の高さ（m）を取り出し、最低は無ければ null', () => {
    const d = parseHeightControlDistricts(height)
    expect(d[0]).toMatchObject({ id: 'h1', function: 18, maximumBuildingHeightM: 14, minimumBuildingHeightM: null })
  })
})

describe('districtsAtPoint（点を含むもの）', () => {
  it('内側の点は含み、境界上の点は含まない', () => {
    const d = parseFirePreventionDistricts(fire)
    expect(districtsAtPoint(d, { lat: 35.65, lon: 139.85 }).map((x) => x.id)).toEqual(['f1'])
    expect(districtsAtPoint(d, { lat: 35.6, lon: 139.85 })).toEqual([])
  })
})
