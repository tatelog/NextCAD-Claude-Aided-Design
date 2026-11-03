// 仕様: PLATEAU の urf（都市計画決定情報）の用途地域（urf:UseDistrict）の解析（D-02 C4、A-03 G15、ハブ E-80・E-85）。
// 実データの構造（2026-11-03、江東区のメッシュ 533946 の GML を確認）:
//   urf:function（用途地域の区分コード）、urf:floorAreaRate（容積率・％）、urf:buildingCoverageRate（建蔽率・％）、
//   urf:buildingHeightLimits（高さの上限・m）、urf:notificationNumber（告示番号）、gml:posList（範囲。EPSG:6697 は 緯度 経度 の順）。
// 仕様 1: 各 UseDistrict から、区分・容積率・建蔽率・告示番号・範囲（緯度経度の環）を取り出す。値が無ければ null（推測で埋めない）。
// 仕様 2: 範囲（最初の外環）の中に点（緯度・経度）が入る用途地域を返す。境界上は含めない。
// 仕様 3: 数値は数値として読む。数字でなければ null。
import { describe, expect, it } from 'vitest'
import { parseUseDistricts, districtsAt } from './urf'

const xml = `
<core:cityObjectMember>
  <urf:UseDistrict gml:id="a">
    <urf:function codeSpace="x">1</urf:function>
    <urf:notificationNumber>東京都告示第1073号</urf:notificationNumber>
    <urf:lod1MultiSurface><gml:MultiSurface><gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>
      35.60 139.80 35.60 139.90 35.70 139.90 35.70 139.80 35.60 139.80
    </gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember></gml:MultiSurface></urf:lod1MultiSurface>
    <urf:floorAreaRate>200</urf:floorAreaRate>
    <urf:buildingCoverageRate>60</urf:buildingCoverageRate>
    <urf:buildingHeightLimits uom="m">20</urf:buildingHeightLimits>
  </urf:UseDistrict>
</core:cityObjectMember>
<core:cityObjectMember>
  <urf:UseDistrict gml:id="b">
    <urf:function codeSpace="x">5</urf:function>
    <urf:lod1MultiSurface><gml:MultiSurface><gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>
      35.70 139.80 35.70 139.90 35.80 139.90 35.80 139.80 35.70 139.80
    </gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember></gml:MultiSurface></urf:lod1MultiSurface>
    <urf:floorAreaRate>abc</urf:floorAreaRate>
  </urf:UseDistrict>
</core:cityObjectMember>`

describe('parseUseDistricts（用途地域の解析）', () => {
  const d = parseUseDistricts(xml)

  it('区分・容積率・建蔽率・高さ・告示番号を取り出す', () => {
    expect(d[0]).toMatchObject({
      id: 'a',
      function: 1,
      floorAreaRatePercent: 200,
      buildingCoverageRatePercent: 60,
      heightLimitM: 20,
      notificationNumber: '東京都告示第1073号',
    })
  })

  it('値が無い・数字でなければ null（推測で埋めない）', () => {
    expect(d[1]!.buildingCoverageRatePercent).toBeNull()
    expect(d[1]!.heightLimitM).toBeNull()
    expect(d[1]!.floorAreaRatePercent).toBeNull()
    expect(d[1]!.notificationNumber).toBeNull()
  })

  it('範囲は緯度・経度の順の環として読む', () => {
    expect(d[0]!.ring[0]).toEqual({ lat: 35.6, lon: 139.8 })
    expect(d[0]!.ring).toHaveLength(5)
  })
})

describe('districtsAt（点を含む用途地域）', () => {
  const d = parseUseDistricts(xml)

  it('内側の点は、その範囲の用途地域を返す', () => {
    expect(districtsAt(d, { lat: 35.65, lon: 139.85 }).map((x) => x.id)).toEqual(['a'])
  })

  it('どの範囲にも無い点、境界上の点は含めない', () => {
    expect(districtsAt(d, { lat: 35.5, lon: 139.85 })).toEqual([])
    expect(districtsAt(d, { lat: 35.6, lon: 139.85 })).toEqual([])
  })
})
