// 仕様（統括の依頼 2026-11-06。4: 3D の地面に、地理院タイル（標準地図）を、確定した敷地の周りに貼る。出典「地理院タイル」を出す。地図の切り替えで消す）:
// 仕様 G1: タイルの URL は、地理院の標準地図（basemap の GSI_BASEMAP_TILES）の形（z/x/y.png）で作る。
// 仕様 G2: タイルの範囲（経緯度）は、そのタイルの中の点を含む。隣のタイルと辺を共有する。
// 仕様 G3: 確定した地点の周りは、その地点を含むタイルの周りの 3 × 3 枚（約 750 m）。
// 仕様 G4: タイルの四隅は、敷地と同じ枠の平面（mm）に直す。北は +y、東は +x（敷地と同じ向き）。一辺は約 250 m（z17）。
// 仕様 G5: 枠（敷地の枠）が無ければ、タイルは出さない。
// 仕様 G6: 出典は「地理院タイル」を含む文字列。
import { describe, expect, it } from 'vitest'
import { GSI_BASEMAP_TILES } from './basemap'
import { parcelFrameOf, planeOfLonLat } from './parcelPlane'
import { tileFromLonLat } from './tiles'
import { GSI_ATTRIBUTION, mapTilesOf, MAP_TILE_ZOOM, tileBoundsOf, tileUrlOf } from './gsiTiles'

// 江東区（新砂二丁目付近）の、約 20 m × 20 m の筆（経緯度の四角）
const CENTER = { lon: 139.8, lat: 35.65 }
const PARCEL = {
  type: 'Polygon',
  coordinates: [
    [
      [139.7999, 35.6499],
      [139.8001, 35.6499],
      [139.8001, 35.6501],
      [139.7999, 35.6501],
      [139.7999, 35.6499],
    ],
  ],
}

describe('タイルの URL（仕様 G1）', () => {
  it('仕様 G1: 地理院の標準地図の形（z/x/y.png）で作る', () => {
    expect(tileUrlOf(17, 3, 4)).toBe(GSI_BASEMAP_TILES[0]!.replace('{z}', '17').replace('{x}', '3').replace('{y}', '4'))
    expect(tileUrlOf(17, 3, 4)).toMatch(/\/17\/3\/4\.png$/)
  })
})

describe('タイルの範囲（仕様 G2）', () => {
  it('仕様 G2: 中心の点は、そのタイルの範囲に入る（経度は西以上・東未満、緯度は南以上・北未満）', () => {
    const t = tileFromLonLat(CENTER, MAP_TILE_ZOOM)
    const b = tileBoundsOf(t.x, t.y, MAP_TILE_ZOOM)
    expect(CENTER.lon).toBeGreaterThanOrEqual(b.west)
    expect(CENTER.lon).toBeLessThan(b.east)
    expect(CENTER.lat).toBeGreaterThanOrEqual(b.south)
    expect(CENTER.lat).toBeLessThan(b.north)
    expect(b.west).toBeLessThan(b.east)
    expect(b.south).toBeLessThan(b.north)
  })

  it('仕様 G2: 隣のタイル（東隣）は、西端が、このタイルの東端と同じ', () => {
    const t = tileFromLonLat(CENTER, MAP_TILE_ZOOM)
    const here = tileBoundsOf(t.x, t.y, MAP_TILE_ZOOM)
    const east = tileBoundsOf(t.x + 1, t.y, MAP_TILE_ZOOM)
    expect(east.west).toBeCloseTo(here.east, 12)
  })
})

describe('タイルの枚数と平面への変換（仕様 G3・G4）', () => {
  const frame = parcelFrameOf(PARCEL)!

  it('仕様 G3: 中心の周りは 3 × 3 枚（9 枚）', () => {
    expect(mapTilesOf(CENTER, frame)).toHaveLength(9)
  })

  it('仕様 G4: 四隅の平面は、敷地と同じ枠の平面（北が +y、東が +x）。一辺は約 250 m（z17）', () => {
    const tiles = mapTilesOf(CENTER, frame)
    // 中心を含むタイルの四隅（中心の平面の点を、四隅の中に含む）
    const p = planeOfLonLat(frame, CENTER.lon, CENTER.lat)
    const hit = tiles.find(
      (t) => t.corners.nw.x <= p.x && p.x <= t.corners.ne.x && t.corners.sw.y <= p.y && p.y <= t.corners.nw.y,
    )
    expect(hit).toBeDefined()
    const c = hit!.corners
    expect(c.nw.y).toBeGreaterThan(c.sw.y) // 北（上）は南（下）より平面の y が大きい
    expect(c.ne.x).toBeGreaterThan(c.nw.x) // 東は西より x が大きい
    const sizeM = (c.ne.x - c.nw.x) / 1000
    expect(sizeM).toBeGreaterThan(230)
    expect(sizeM).toBeLessThan(270)
  })

  it('仕様 G5: 枠が無ければ、タイルは出さない', () => {
    expect(mapTilesOf(CENTER, null)).toEqual([])
  })
})

describe('出典（仕様 G6）', () => {
  it('仕様 G6: 出典の文字列は「地理院タイル」を含む', () => {
    expect(GSI_ATTRIBUTION).toContain('地理院タイル')
  })
})
