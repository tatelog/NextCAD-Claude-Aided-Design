// 仕様（準備スクリプトの変換）から書いたテスト。実装を読まずに書いている。
// 仕様:
// - 道路: 国土数値情報（道路 N13）の GeoJSON の 1 行（Feature）を、{ w: 幅員区分 N13_006, c: 道路分類 N13_003, s: 道路状態 N13_004, g: [[経度, 緯度], ...] } にする
// - 道路は、江東区の範囲（経度 139.74〜139.88、緯度 35.58〜35.76）に一点でも入るものだけ残す。外れるものは null
// - 建物: PLATEAU の建物 GML から LOD1（底面と高さ）を取り出す。高さが無い・0 以下（-9999）・輪郭が無いものは数えるだけで出さない
// - 建物の出力は GeoJSON の FeatureCollection。ポリゴンは [経度, 緯度] の閉じた環で、プロパティ h が高さ（m）
// - 筆: 変換済みの GeoJSON の各筆に「筆UID」（地図名|筆ID）を付ける（筆IDは地図の中でしか一意でない）
import { describe, expect, it } from 'vitest'
import { buildingsFromGml, parcelsWithUid, roadFromFeatureLine } from './convert'

const INSIDE_LINE =
  '{ "type": "Feature", "properties": { "N13_001": "2022-03-11", "N13_002": "1", "N13_003": "3", "N13_004": "1", "N13_005": 0, "N13_006": "2", "N13_007": "1", "N13_008": "533900" }, "geometry": { "type": "LineString", "coordinates": [ [ 139.8, 35.6 ], [ 139.801, 35.601 ] ] } },'

const OUTSIDE_LINE =
  '{ "type": "Feature", "properties": { "N13_001": "2022-03-11", "N13_002": "1", "N13_003": "3", "N13_004": "1", "N13_005": 0, "N13_006": "2", "N13_007": "1", "N13_008": "533900" }, "geometry": { "type": "LineString", "coordinates": [ [ 139.0, 35.3 ], [ 139.001, 35.301 ] ] } },'

describe('roadFromFeatureLine', () => {
  it('N13 の 1 行を、幅員区分・道路分類・状態と経緯度の列にする', () => {
    expect(roadFromFeatureLine(INSIDE_LINE)).toEqual({
      w: 2,
      c: 3,
      s: 1,
      g: [
        [139.8, 35.6],
        [139.801, 35.601],
      ],
    })
  })

  it('江東区の範囲の外の道路は、null にする', () => {
    expect(roadFromFeatureLine(OUTSIDE_LINE)).toBeNull()
  })

  it('Feature でない行（ヘッダなど）は、null にする', () => {
    expect(roadFromFeatureLine('{ "type": "FeatureCollection",')).toBeNull()
  })
})

const GML = `<core:CityModel xmlns:core="x" xmlns:bldg="y" xmlns:gml="z">
<bldg:Building gml:id="a"><bldg:measuredHeight uom="m">6.8</bldg:measuredHeight><bldg:lod0RoofEdge><gml:MultiSurface><gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>35.59722 139.79149 0 35.59724 139.79145 0 35.59719 139.79141 0 35.59722 139.79149 0</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember></gml:MultiSurface></bldg:lod0RoofEdge></bldg:Building>
<bldg:Building gml:id="b"><bldg:measuredHeight uom="m">-9999</bldg:measuredHeight><bldg:lod0RoofEdge><gml:posList>35.5 139.7 0 35.5 139.8 0 35.6 139.8 0</gml:posList></bldg:lod0RoofEdge></bldg:Building>
</core:CityModel>`

describe('buildingsFromGml', () => {
  it('高さのある建物を、[経度, 緯度] の閉じた環と高さ h の GeoJSON にする。不明な高さは出さず、件数に数える', () => {
    const r = buildingsFromGml(GML)
    expect(r.skipped).toBe(1)
    expect(r.geojson.type).toBe('FeatureCollection')
    expect(r.geojson.features).toHaveLength(1)
    const f = r.geojson.features[0]!
    expect(f.properties.h).toBe(6.8)
    expect(f.geometry.type).toBe('Polygon')
    expect(f.geometry.coordinates[0]![0]).toEqual([139.79149, 35.59722])
    expect(f.geometry.coordinates[0]!.at(-1)).toEqual([139.79149, 35.59722])
  })
})

describe('parcelsWithUid', () => {
  it('各筆に「地図名|筆ID」の筆UIDを付ける', () => {
    const fc: { type: 'FeatureCollection'; features: { properties: Record<string, string> }[] } = {
      type: 'FeatureCollection',
      features: [{ properties: { 筆ID: 'H000000013', 地図名: '10121_hosei_20121129083849', 地番: '2-7' } }],
    }
    const out = parcelsWithUid(fc)
    expect(out.features[0]!.properties['筆UID']).toBe('10121_hosei_20121129083849|H000000013')
    expect(out.features[0]!.properties['地番']).toBe('2-7')
  })
})
