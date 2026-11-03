// 仕様: 敷地の周辺建物（PLATEAU の 3 次メッシュ単位の建物ファイル）を、zip から範囲取得して読む。
// 仕様 1: 点を含む 3 次メッシュ（中心）と、その周囲 8 個の番号を返す。中心が先頭、重複なし。
// 仕様 2: 東隣の番号は中心の経度方向の桁が +1（53394609）。北隣は緯度方向の桁が +1（53394618）。
// 仕様 3: 基準点からの平面距離（平面直角 IX 系、m を mm）。北へ 0.001° ≈ 111 m、東へ 0.001° ≈ 90 m。
// 仕様 4: 周辺建物は、ZIP にあるメッシュのファイルだけを読む。無いメッシュはエラーにせず飛ばす。
// 仕様 5: 基準点から半径（既定 400 m）以内に頂点がある建物だけを返す。
import { describe, expect, it } from 'vitest'
import { loadNeighborBuildings, neighborMeshCodes, toPlaneMm } from './neighborBuildings'
import { buildZip, serveZip, type FixtureFile } from './zipFixture'

const POINT = { lat: 35.673094, lon: 139.860149 }

// 1 件の建物（一辺 0.0001°、高さ 10 m）を持つ GML。中心の点から lat・lon だけずらした位置に置く
function gmlWithBuildings(items: { id: string; lat: number; lon: number }[]): Uint8Array {
  const body = items
    .map(({ id, lat, lon }) => {
      const d = 0.0001
      const ring = `${lat} ${lon} 1 ${lat} ${lon + d} 1 ${lat + d} ${lon + d} 1 ${lat + d} ${lon} 1 ${lat} ${lon} 1`
      return `<core:cityObjectMember><bldg:Building gml:id="${id}">
  <bldg:measuredHeight uom="m">10</bldg:measuredHeight>
  <bldg:storeysAboveGround>3</bldg:storeysAboveGround>
  <bldg:lod1Solid><gml:Solid><gml:exterior><gml:CompositeSurface><gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList srsDimension="3">${ring}</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember></gml:CompositeSurface></gml:exterior></gml:Solid></bldg:lod1Solid>
</bldg:Building></core:cityObjectMember>`
    })
    .join('\n')
  return new TextEncoder().encode(
    `<core:CityModel xmlns:core="http://www.opengis.net/citygml/2.0" xmlns:bldg="http://www.opengis.net/citygml/building/2.0" xmlns:gml="http://www.opengis.net/gml">${body}</core:CityModel>`,
  )
}

describe('neighborMeshCodes（3 次メッシュの 3×3）', () => {
  it('中心が先頭で、9 個の番号が重複なく並ぶ', () => {
    const codes = neighborMeshCodes(POINT)
    expect(codes[0]).toBe('53394608')
    expect(codes).toHaveLength(9)
    expect(new Set(codes).size).toBe(9)
  })

  it('東隣と北隣の番号', () => {
    const codes = neighborMeshCodes(POINT)
    expect(codes).toContain('53394609')
    expect(codes).toContain('53394618')
  })
})

describe('toPlaneMm（平面直角 IX 系、基準点からの mm）', () => {
  it('基準点は (0, 0)', () => {
    expect(toPlaneMm(POINT, POINT)).toEqual({ x: 0, y: 0 })
  })

  it('北へ 0.001° は約 111 m（y が増える）', () => {
    const p = toPlaneMm({ lat: POINT.lat + 0.001, lon: POINT.lon }, POINT)
    expect(p.y).toBeGreaterThan(110_000)
    expect(p.y).toBeLessThan(112_000)
    expect(Math.abs(p.x)).toBeLessThan(100)
  })

  it('東へ 0.001° は約 90 m（x が増える）', () => {
    const p = toPlaneMm({ lat: POINT.lat, lon: POINT.lon + 0.001 }, POINT)
    expect(p.x).toBeGreaterThan(89_000)
    expect(p.x).toBeLessThan(91_500)
  })
})

describe('loadNeighborBuildings（周辺建物の読み込み）', () => {
  const near = { id: 'bldg_near', lat: POINT.lat + 0.0001, lon: POINT.lon }
  const far = { id: 'bldg_far', lat: POINT.lat + 0.01, lon: POINT.lon }
  const east = { id: 'bldg_east', lat: POINT.lat, lon: POINT.lon + 0.0003 }

  const files: FixtureFile[] = [
    { name: 'udx/bldg/53394608_bldg_6697_op.gml', data: gmlWithBuildings([near, far]) },
    { name: 'udx/bldg/53394609_bldg_6697_op.gml', data: gmlWithBuildings([east]) },
  ]

  it('中心と東隣のファイルを読み、半径内の建物だけを返す（無いメッシュは飛ばす）', async () => {
    const zip = buildZip(files)
    const buildings = await loadNeighborBuildings(POINT, 'https://example.test/ward.zip', serveZip(zip, []))
    expect(buildings.map((b) => b.id).sort()).toEqual(['bldg_east', 'bldg_near'])
  })

  it('返す建物は緯度経度の底面を持つ', async () => {
    const zip = buildZip(files)
    const buildings = await loadNeighborBuildings(POINT, 'https://example.test/ward.zip', serveZip(zip, []))
    const near1 = buildings.find((b) => b.id === 'bldg_near')!
    expect(near1.footprints[0]![0]).toEqual({ lat: near.lat, lon: near.lon })
    expect(near1.heightM).toBe(10)
  })
})
