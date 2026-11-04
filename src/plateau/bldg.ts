// PLATEAU の建物（bldg, CityGML 2.0）の GML から、建物ごとの底面・計測高さ・地上階数を読む。
// 底面は lod1Solid のうち最も低い高さの面。座標は posList の順（緯度、経度、高さ）。
export interface LatLon {
  lat: number
  lon: number
}

export interface PlateauBuilding {
  id: string
  /** 計測高さ（m）。PLATEAU の不明値 -9999 は null */
  heightM: number | null
  storeys: number
  /** 底面（部分が離れていれば複数） */
  footprints: LatLon[][]
}

const GROUND_TOLERANCE_M = 0.01
// PLATEAU で高さが分からない建物に入っている値
const UNKNOWN_HEIGHT = -9999

function parseTriples(text: string): { lat: number; lon: number; z: number }[] {
  const nums = text.trim().split(/\s+/).map(Number)
  const points: { lat: number; lon: number; z: number }[] = []
  for (let i = 0; i + 2 < nums.length; i += 3) {
    points.push({ lat: nums[i]!, lon: nums[i + 1]!, z: nums[i + 2]! })
  }
  return points
}

function footprintsOf(solid: string): LatLon[][] {
  const rings = [...solid.matchAll(/<gml:posList[^>]*>([^<]*)<\/gml:posList>/g)].map((m) => parseTriples(m[1]!))
  if (rings.length === 0) return []
  const groundZ = Math.min(...rings.flat().map((p) => p.z))
  const bottoms = rings.filter((ring) => ring.every((p) => p.z <= groundZ + GROUND_TOLERANCE_M))
  return bottoms.map((ring) => {
    const points = ring.map((p) => ({ lat: p.lat, lon: p.lon }))
    const first = points[0]
    const last = points[points.length - 1]
    // 閉じ点（最初と同じ点）は除く
    return first && last && first.lat === last.lat && first.lon === last.lon ? points.slice(0, -1) : points
  })
}

export function parseBuildings(gml: string): PlateauBuilding[] {
  return gml
    .split('<bldg:Building ')
    .slice(1)
    .map((chunk) => {
      const end = chunk.indexOf('</bldg:Building>')
      const body = end >= 0 ? chunk.slice(0, end) : chunk
      const solid = /<bldg:lod1Solid>([\s\S]*?)<\/bldg:lod1Solid>/.exec(body)?.[1] ?? ''
      const height = Number(/<bldg:measuredHeight[^>]*>([^<]*)</.exec(body)?.[1])
      return {
        id: /^gml:id="([^"]*)"/.exec(chunk)?.[1] ?? '',
        heightM: height === UNKNOWN_HEIGHT ? null : height,
        storeys: Number(/<bldg:storeysAboveGround>([^<]*)</.exec(body)?.[1]),
        footprints: footprintsOf(solid),
      }
    })
}
