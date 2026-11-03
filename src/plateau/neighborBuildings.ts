// 敷地の周辺建物（PLATEAU の建物、3 次メッシュ単位のファイル）を、区の zip から範囲取得して読む。
// 点を含む 3 次メッシュと、その周囲 8 個を読み、基準点から半径以内に頂点がある建物だけを返す。
import proj4 from 'proj4'
import { meshCode3rd } from './mesh3'
import { parseBuildings, type LatLon, type PlateauBuilding } from './bldg'
import { openZip } from './zipRange'

// 平面直角座標系 IX 系（EPSG:6677 相当、東京 23 区の系）。単位は m。
const ZONE_IX = '+proj=tmerc +lat_0=36 +lon_0=139.8333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs'
// 3 次メッシュの 1 区画: 緯度 30 秒（1/120 度）、経度 45 秒（1/80 度）
const LAT_STEP = 1 / 120
const LON_STEP = 1 / 80
const DEFAULT_RADIUS_MM = 400_000

export function neighborMeshCodes(point: LatLon): string[] {
  const codes = [meshCode3rd(point)]
  for (const dLat of [-1, 0, 1]) {
    for (const dLon of [-1, 0, 1]) {
      if (dLat === 0 && dLon === 0) continue
      codes.push(meshCode3rd({ lat: point.lat + dLat * LAT_STEP, lon: point.lon + dLon * LON_STEP }))
    }
  }
  return [...new Set(codes)]
}

// 基準点からの平面距離（mm）。x が東、y が北。
export function toPlaneMm(point: LatLon, origin: LatLon): { x: number; y: number } {
  const p = proj4('WGS84', ZONE_IX, [point.lon, point.lat]) as [number, number]
  const o = proj4('WGS84', ZONE_IX, [origin.lon, origin.lat]) as [number, number]
  return { x: (p[0] - o[0]) * 1000, y: (p[1] - o[1]) * 1000 }
}

// 基準点から半径以内に、どこかの頂点がある建物だけ残す
function withinRadius(building: PlateauBuilding, origin: LatLon, radiusMm: number): boolean {
  return building.footprints.some((ring) =>
    ring.some((p) => {
      const d = toPlaneMm(p, origin)
      return Math.hypot(d.x, d.y) <= radiusMm
    }),
  )
}

export async function loadNeighborBuildings(
  point: LatLon,
  zipUrl: string,
  fetchImpl: typeof fetch = fetch,
  radiusMm: number = DEFAULT_RADIUS_MM,
): Promise<PlateauBuilding[]> {
  const zip = await openZip(zipUrl, fetchImpl)
  const names = new Set(zip.entries.map((e) => e.name))
  const codes = neighborMeshCodes(point)
  // 候補のどれも zip に無いのは、区の範囲外（既定の地点が別の区にあるなど）の可能性が高い。黙って 0 棟にしない
  if (!codes.some((code) => names.has(`udx/bldg/${code}_bldg_6697_op.gml`))) {
    throw new Error('この地点の建物ファイルが zip にありません（区の範囲外の可能性）')
  }
  const found: PlateauBuilding[] = []
  for (const code of codes) {
    const name = `udx/bldg/${code}_bldg_6697_op.gml`
    if (!names.has(name)) continue
    const text = new TextDecoder().decode(await zip.read(name))
    found.push(...parseBuildings(text).filter((b) => withinRadius(b, point, radiusMm)))
  }
  return found
}
