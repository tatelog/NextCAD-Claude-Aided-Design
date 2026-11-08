// PLATEAU の建物 GML（CityGML 2.0）から LOD1 を取り出す。
// 輪郭は bldg:lod0RoofEdge の posList（EPSG:6697 の「緯度 経度 高さ」）、高さは bldg:measuredHeight（m）。
export type Lod1Building = { footprint: [number, number][]; heightM: number }
export type Lod1Result = { buildings: Lod1Building[]; skipped: number }

export function parseLod1(gml: string): Lod1Result {
  const buildings: Lod1Building[] = []
  let skipped = 0
  for (const m of gml.matchAll(/<bldg:Building\b[^>]*>([\s\S]*?)<\/bldg:Building>/g)) {
    const body = m[1]!
    const hm = body.match(/<bldg:measuredHeight[^>]*>\s*([-+0-9.eE]+)\s*</)
    const heightM = hm ? parseFloat(hm[1]!) : NaN
    if (!(heightM > 0)) {
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
    buildings.push({ footprint: ring, heightM })
  }
  return { buildings, skipped }
}
