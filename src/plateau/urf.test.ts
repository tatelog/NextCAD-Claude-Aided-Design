// 仕様: PLATEAU の urf（都市計画決定情報）の用途地域（urf:UseDistrict）の解析（D-02 C4、A-03 G15、ハブ E-80・E-85）。
// 実データの構造（2026-11-03、江東区のメッシュ 533946 の GML を確認）:
//   urf:function（用途地域の区分コード）、urf:floorAreaRate（容積率・％）、urf:buildingCoverageRate（建蔽率・％）、
//   urf:buildingHeightLimits（高さの上限・m）、urf:notificationNumber（告示番号）、gml:posList（範囲。EPSG:6697 は 緯度 経度 の順）。
// 仕様 1: 各 UseDistrict から、区分・容積率・建蔽率・告示番号・範囲（緯度経度の環）を取り出す。値が無ければ null（推測で埋めない）。
// 仕様 2: 範囲（面の外環から穴を除いた面。面が複数なら、どれかに入る）の中に点（緯度・経度）が入る用途地域を返す。境界上は含めない。
// 仕様 4（穴）: 穴（gml:interior）の中の点、穴の境界上の点は、区域に含めない（統括の t68・2026-11-05）。
// 仕様 5（複数の面）: 一つの区域が複数の面（gml:Polygon）からなるときは、どれかの面に入れば区域内。
// 仕様 6（Null）: 告示番号の "Null" は値が無いこと。未取得（null）として返す。
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
    expect(d[0]!.polygons[0]!.exterior[0]).toEqual({ lat: 35.6, lon: 139.8 })
    expect(d[0]!.polygons[0]!.exterior).toHaveLength(5)
  })
})

describe('parseUseDistricts（三つ組の座標）', () => {
  // 実データは srsDimension="3"（緯度 経度 高さ の三つ組）。二つ組として読むと緯度が崩れる（2026-11-03 に発見）
  const xml3 = `
<urf:UseDistrict gml:id="c">
  <urf:function codeSpace="x">1</urf:function>
  <urf:lod1MultiSurface><gml:MultiSurface srsDimension="3"><gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>
    35.60 139.80 10 35.60 139.90 10 35.70 139.90 10 35.70 139.80 10 35.60 139.80 10
  </gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember></gml:MultiSurface></urf:lod1MultiSurface>
  <urf:floorAreaRate>60</urf:floorAreaRate>
</urf:UseDistrict>`

  it('三つ組の座標から、緯度・経度だけを環として読む', () => {
    const d = parseUseDistricts(xml3)
    expect(d[0]!.polygons[0]!.exterior).toHaveLength(5)
    expect(d[0]!.polygons[0]!.exterior[0]).toEqual({ lat: 35.6, lon: 139.8 })
    expect(d[0]!.polygons[0]!.exterior[1]).toEqual({ lat: 35.6, lon: 139.9 })
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

// 穴（仕様 4）と複数の面（仕様 5）。座標は緯度 経度 高さの三つ組。外環は (0,0)-(0,10)-(10,10)-(10,0)、穴は (4,4)-(6,6)。
const holed = `
<urf:UseDistrict gml:id="holed">
  <urf:function codeSpace="x">11</urf:function>
  <urf:lod1MultiSurface><gml:MultiSurface srsDimension="3"><gml:surfaceMember><gml:Polygon>
    <gml:exterior><gml:LinearRing><gml:posList>0 0 1 0 10 1 10 10 1 10 0 1 0 0 1</gml:posList></gml:LinearRing></gml:exterior>
    <gml:interior><gml:LinearRing><gml:posList>4 4 1 4 6 1 6 6 1 6 4 1 4 4 1</gml:posList></gml:LinearRing></gml:interior>
  </gml:Polygon></gml:surfaceMember></gml:MultiSurface></urf:lod1MultiSurface>
  <urf:notificationNumber>Null</urf:notificationNumber>
</urf:UseDistrict>
<urf:UseDistrict gml:id="multi">
  <urf:function codeSpace="x">9</urf:function>
  <urf:lod1MultiSurface><gml:MultiSurface srsDimension="3">
    <gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>0 0 1 0 1 1 1 1 1 1 0 1 0 0 1</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember>
    <gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>20 20 1 20 30 1 30 30 1 30 20 1 20 20 1</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember>
  </gml:MultiSurface></urf:lod1MultiSurface>
</urf:UseDistrict>`

describe('穴と複数の面（仕様 4・5・6）', () => {
  const d = parseUseDistricts(holed)

  it('穴は面の穴として読み、告示番号の "Null" は未取得（null）', () => {
    expect(d[0]!.polygons).toHaveLength(1)
    expect(d[0]!.polygons[0]!.holes).toHaveLength(1)
    expect(d[0]!.notificationNumber).toBeNull()
  })

  it('外環の中で穴の外の点は区域内、穴の中の点と穴の境界上の点は区域外', () => {
    expect(districtsAt(d, { lat: 2, lon: 2 }).map((x) => x.id)).toEqual(['holed'])
    expect(districtsAt(d, { lat: 5, lon: 5 }).map((x) => x.id)).toEqual([])
    expect(districtsAt(d, { lat: 4, lon: 5 }).map((x) => x.id)).toEqual([])
  })

  it('複数の面のどれかに入る点は区域内（面の数だけ見る）', () => {
    expect(d[1]!.polygons).toHaveLength(2)
    expect(districtsAt(d, { lat: 25, lon: 25 }).map((x) => x.id)).toEqual(['multi'])
    expect(districtsAt(d, { lat: 15, lon: 15 }).map((x) => x.id)).toEqual([])
  })
})
