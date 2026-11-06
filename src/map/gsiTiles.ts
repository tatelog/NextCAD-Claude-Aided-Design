// 3D の地面に貼る地理院タイル（標準地図）の範囲（統括の依頼 2026-11-06。4）。確定した地点の周りの 3 × 3 枚を、敷地と同じ枠の平面（mm）の四隅で返す。決定論。
// 番号の計算は tiles.ts、URL の形は basemap.ts（GSI_BASEMAP_TILES）。読み込みと貼るのは UI（Volume3D）。
import type { Point } from '../geom/viewport'
import { GSI_BASEMAP_TILES } from './basemap'
import { planeOfLonLat, type ParcelFrame } from './parcelPlane'
import { tileFromLonLat } from './tiles'

/** 出典（国土地理院の地理院タイル。3D の画面に出す） */
export const GSI_ATTRIBUTION = '地理院タイル（国土地理院）'

/** 地面に貼るタイルの倍率（z17 は、緯度 35 度付近で一辺約 250 m） */
export const MAP_TILE_ZOOM = 17

/** 中心を含むタイルの周り、何枚ぶん広げるか（1 なら 3 × 3） */
const RING = 1

/** タイルの URL（地理院の標準地図の形 z/x/y.png） */
export function tileUrlOf(z: number, x: number, y: number): string {
  return GSI_BASEMAP_TILES[0]!.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y))
}

/** タイルの範囲（経緯度）。西・東・南・北 */
export function tileBoundsOf(x: number, y: number, z: number): { west: number; east: number; south: number; north: number } {
  const n = 2 ** z
  const lonOf = (tx: number) => (tx / n) * 360 - 180
  const latOf = (ty: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n))) * 180) / Math.PI
  return { west: lonOf(x), east: lonOf(x + 1), north: latOf(y), south: latOf(y + 1) }
}

/** 地面に貼る一枚のタイル。四隅は敷地と同じ枠の平面（mm）。北西・北東・南東・南西 */
export interface MapTile {
  url: string
  corners: { nw: Point; ne: Point; se: Point; sw: Point }
}

/** 確定した地点の周りのタイル（3 × 3）。枠が無ければ空 */
export function mapTilesOf(center: { lat: number; lon: number }, frame: ParcelFrame | null, zoom: number = MAP_TILE_ZOOM): MapTile[] {
  if (!frame) return []
  const c = tileFromLonLat(center, zoom)
  const tiles: MapTile[] = []
  for (let dy = -RING; dy <= RING; dy++) {
    for (let dx = -RING; dx <= RING; dx++) {
      const x = c.x + dx
      const y = c.y + dy
      const b = tileBoundsOf(x, y, zoom)
      tiles.push({
        url: tileUrlOf(zoom, x, y),
        corners: {
          nw: planeOfLonLat(frame, b.west, b.north),
          ne: planeOfLonLat(frame, b.east, b.north),
          se: planeOfLonLat(frame, b.east, b.south),
          sw: planeOfLonLat(frame, b.west, b.south),
        },
      })
    }
  }
  return tiles
}
