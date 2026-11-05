// 仕様（PLATEAU の建物 GML から LOD1 を取り出す）から書いたテスト。実装を読まずに書いている。
// 仕様:
// - 建物は bldg:Building の 1 件ごと。bldg:lod0RoofEdge の最初の gml:posList から、輪郭を取る
// - 座標は EPSG:6697 の並び「緯度 経度 高さ」。出力は [経度, 緯度] にし、高さは捨てる
// - 輪郭は閉じた環にする（最初と最後が同じ点）。点が 3 つ未満なら取り出さない
// - 高さは bldg:measuredHeight（m）。無い・0 以下（-9999 は不明）の建物は取り出さず、件数に数える
// - bldg:lod0RoofEdge が無い建物も取り出さず、件数に数える
import { describe, expect, it } from 'vitest'
import { parseLod1 } from './lod1'

const ROOF_EDGE = (posList: string) => `<bldg:lod0RoofEdge><gml:MultiSurface><gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>${posList}</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember></gml:MultiSurface></bldg:lod0RoofEdge>`

const VALID = `<bldg:Building gml:id="a"><bldg:measuredHeight uom="m">6.8</bldg:measuredHeight>${ROOF_EDGE(
  '35.59722 139.79149 0 35.59724 139.79145 0 35.59719 139.79141 0 35.59717 139.79146 0 35.59722 139.79149 0',
)}</bldg:Building>`

const UNKNOWN_HEIGHT = `<bldg:Building gml:id="b"><bldg:measuredHeight uom="m">-9999</bldg:measuredHeight>${ROOF_EDGE(
  '35.59722 139.79149 0 35.59724 139.79145 0 35.59719 139.79141 0',
)}</bldg:Building>`

const NO_ROOF_EDGE = `<bldg:Building gml:id="c"><bldg:measuredHeight uom="m">4.0</bldg:measuredHeight></bldg:Building>`

const GML = `<core:CityModel xmlns:core="http://www.opengis.net/citygml/2.0" xmlns:bldg="http://www.opengis.net/citygml/building/2.0" xmlns:gml="http://www.opengis.net/gml">${VALID}${UNKNOWN_HEIGHT}${NO_ROOF_EDGE}</core:CityModel>`

describe('parseLod1', () => {
  it('高さのある建物の輪郭を [経度, 緯度] の閉じた環で取り出し、高さを付ける', () => {
    const r = parseLod1(GML)
    expect(r.buildings).toHaveLength(1)
    const b = r.buildings[0]!
    expect(b.heightM).toBe(6.8)
    expect(b.footprint[0]).toEqual([139.79149, 35.59722])
    expect(b.footprint[b.footprint.length - 1]).toEqual([139.79149, 35.59722])
    expect(b.footprint).toHaveLength(5)
  })

  it('高さが不明（-9999）・輪郭が無い建物は取り出さず、件数に数える', () => {
    const r = parseLod1(GML)
    expect(r.skipped).toBe(2)
  })

  it('最初と最後が同じ点の環は、点を重ねて足さない', () => {
    const r = parseLod1(GML)
    expect(r.buildings[0]!.footprint).toHaveLength(5)
  })

  it('建物が無い GML は、空の結果を返す', () => {
    expect(parseLod1('<core:CityModel xmlns:core="x"></core:CityModel>')).toEqual({ buildings: [], skipped: 0 })
  })
})
