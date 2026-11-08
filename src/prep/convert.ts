// 準備スクリプトの変換（純粋な関数だけ。Node の CLI（scripts/prepare-local-data.ts）から使う）。
// 依存は持たない（CLI から直接読めるように、import を付けない）。
// 江東区の範囲（デモの 2次メッシュ 533936・533946 を含む、少し広め）
export const KOTO_BBOX = { minLon: 139.74, maxLon: 139.88, minLat: 35.58, maxLat: 35.76 }

export type RoadRecord = { w: number; c: number; s: number; g: [number, number][] | [number, number][][] }

// 国土数値情報（道路 N13）の GeoJSON の 1 行（Feature）を、道路の記録にする。範囲の外・Feature でない行は null
export function roadFromFeatureLine(line: string, bbox = KOTO_BBOX): RoadRecord | null {
  const trimmed = line.trim().replace(/,$/, '')
  if (!trimmed.startsWith('{') || !trimmed.includes('"Feature"')) return null
  const obj = JSON.parse(trimmed) as {
    properties: Record<string, string | number>
    geometry: { type: string; coordinates: [number, number][] | [number, number][][] }
  }
  const lines: [number, number][][] =
    obj.geometry.type === 'LineString'
      ? [obj.geometry.coordinates as [number, number][]]
      : (obj.geometry.coordinates as [number, number][][])
  const inside = lines.some((ln) => ln.some(([x, y]) => x >= bbox.minLon && x <= bbox.maxLon && y >= bbox.minLat && y <= bbox.maxLat))
  if (!inside) return null
  const p = obj.properties
  const g = obj.geometry.type === 'LineString' ? (lines[0] as [number, number][]) : lines
  return { w: Number(p['N13_006']), c: Number(p['N13_003']), s: Number(p['N13_004']), g }
}

export type BuildingFeature = {
  type: 'Feature'
  properties: { h: number }
  geometry: { type: 'Polygon'; coordinates: [number, number][][] }
}

// PLATEAU の建物 GML から LOD1 を取り出し、GeoJSON にする（高さ不明・輪郭なしは件数に数える）
export function buildingsFromGml(gml: string): { geojson: { type: 'FeatureCollection'; features: BuildingFeature[] }; skipped: number } {
  const features: BuildingFeature[] = []
  let skipped = 0
  for (const m of gml.matchAll(/<bldg:Building\b[^>]*>([\s\S]*?)<\/bldg:Building>/g)) {
    const body = m[1]!
    const hm = body.match(/<bldg:measuredHeight[^>]*>\s*([-+0-9.eE]+)\s*</)
    const h = hm ? parseFloat(hm[1]!) : NaN
    if (!(h > 0)) {
      skipped++
      continue
    }
    const roof = body.match(/<bldg:lod0RoofEdge>([\s\S]*?)<\/bldg:lod0RoofEdge>/)
    const pos = roof?.[1]?.match(/<gml:posList>([^<]*)<\/gml:posList>/)
    if (!pos) {
      skipped++
      continue
    }
    const v = pos[1]!.trim().split(/\s+/).map(Number)
    const ring: [number, number][] = []
    for (let i = 0; i + 2 < v.length; i += 3) {
      const lon = v[i + 1]!
      const lat = v[i]!
      const last = ring[ring.length - 1]
      if (!last || last[0] !== lon || last[1] !== lat) ring.push([lon, lat])
    }
    if (ring.length < 3) {
      skipped++
      continue
    }
    const first = ring[0]!
    const end = ring[ring.length - 1]!
    if (first[0] !== end[0] || first[1] !== end[1]) ring.push(first)
    features.push({ type: 'Feature', properties: { h }, geometry: { type: 'Polygon', coordinates: [ring] } })
  }
  return { geojson: { type: 'FeatureCollection', features }, skipped }
}

// 変換済みの筆（GeoJSON）の各筆に、筆UID（地図名|筆ID）を付ける
export function parcelsWithUid<T extends { features: { properties: Record<string, string> }[] }>(fc: T): T {
  for (const f of fc.features) f.properties['筆UID'] = `${f.properties['地図名']}|${f.properties['筆ID']}`
  return fc
}
