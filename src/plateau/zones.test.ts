// 仕様: PLATEAU の urf の防火地域（urf:FirePreventionDistrict）と高度地区（urf:HeightControlDistrict）の解析（D-02 C4・C11、A-03 G28、ハブ E-80・E-82）。
// 実データの構造（2026-11-03、江東区のメッシュ 533946）:
//   防火: urf:function（24 = 防火地域、25 = 準防火地域）、urf:usage（1 防火地域（地域）、2 防火地域（路線）、3 準防火地域（地域）、4 準防火地域（路線））、告示番号、範囲。
//   高度: urf:function（18 = 高度地区）、urf:maximumBuildingHeight（m。241 件）、urf:minimumBuildingHeight（m。89 件）、告示番号、範囲。
// 仕様 1: 防火地域は区分（防火地域／準防火地域）と用途（地域／路線）に分けて返す。知らない用途コードは弾く。
// 仕様 2: 高度地区は最高・最低の高さ（m）を返す。無ければ null（推測で埋めない）。
// 仕様 3: 地点を含むものだけを返す（境界上は含めない）。
import { describe, expect, it } from 'vitest'
import { parseFirePreventionDistricts, parseHeightControlDistricts, fireKind, fireUsageMismatch, districtsAtPoint } from './zones'

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
    expect(d[0]!.polygons[0]!.exterior).toHaveLength(5)
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

// 仕様 4（穴）・6（Null）。防火の区域（function 24）の中に、準防火（function 25）の穴がある形（江東区 533946 の実データと同じ入れ子）。
const fireHoled = `
<urf:FirePreventionDistrict gml:id="fh">
  <urf:function codeSpace="x">24</urf:function>
  <urf:usage codeSpace="x">1</urf:usage>
  <urf:notificationNumber>Null</urf:notificationNumber>
  <urf:lod1MultiSurface><gml:MultiSurface srsDimension="3"><gml:surfaceMember><gml:Polygon>
    <gml:exterior><gml:LinearRing><gml:posList>0 0 1 0 10 1 10 10 1 10 0 1 0 0 1</gml:posList></gml:LinearRing></gml:exterior>
    <gml:interior><gml:LinearRing><gml:posList>4 4 1 4 6 1 6 6 1 6 4 1 4 4 1</gml:posList></gml:LinearRing></gml:interior>
  </gml:Polygon></gml:surfaceMember></gml:MultiSurface></urf:lod1MultiSurface>
</urf:FirePreventionDistrict>`

// 仕様 5（区分と用途の食い違い）: 区分（function）と用途（usage）が表の組み合わせと合わないときは、食い違いとして印を出す（推測で直さない）。
describe('区分と用途の食い違い（仕様 5）', () => {
  it('区分が準防火（25）で用途が防火地域（路線、2）は食い違い。判定は区分で行う（用途では直さない）', () => {
    expect(fireUsageMismatch({ function: 25, usage: 2 })).toBe(true)
  })

  it('区分と用途が合う組み合わせは、食い違いではない', () => {
    expect(fireUsageMismatch({ function: 24, usage: 1 })).toBe(false)
    expect(fireUsageMismatch({ function: 24, usage: 2 })).toBe(false)
    expect(fireUsageMismatch({ function: 25, usage: 3 })).toBe(false)
    expect(fireUsageMismatch({ function: 25, usage: 4 })).toBe(false)
  })

  it('用途が無い（null）・区分が無いときは、食い違いとは言わない（未取得のまま）', () => {
    expect(fireUsageMismatch({ function: 25, usage: null })).toBe(false)
    expect(fireUsageMismatch({ function: null, usage: 2 })).toBe(false)
  })
})

describe('防火地域の穴（仕様 4・6）', () => {
  it('穴の中の点は、防火地域に含めない。穴の外の点は含める', () => {
    const d = parseFirePreventionDistricts(fireHoled)
    expect(districtsAtPoint(d, { lat: 5, lon: 5 })).toEqual([])
    expect(districtsAtPoint(d, { lat: 2, lon: 2 }).map((x) => x.id)).toEqual(['fh'])
  })

  it('告示番号の "Null" は未取得（null）', () => {
    expect(parseFirePreventionDistricts(fireHoled)[0]!.notificationNumber).toBeNull()
  })
})
