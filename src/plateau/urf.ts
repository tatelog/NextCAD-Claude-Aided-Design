// PLATEAU の urf（都市計画決定情報）の用途地域（urf:UseDistrict）を解析する（D-02 C4、A-03 G15、ハブ E-80・E-85）。
// 正規表現でタグを読む（構造は 2026-11-03 に江東区のメッシュ 533946 の GML で確認）。値が無い、または数字でなければ null。
// 範囲は gml:posList（EPSG:6697 は 緯度 経度 の順）。点の判定は境界上を含めない。

export interface UseDistrict {
  id: string
  /** 用途地域の区分コード（urf:function） */
  function: number | null
  /** 容積率（％） */
  floorAreaRatePercent: number | null
  /** 建蔽率（％） */
  buildingCoverageRatePercent: number | null
  /** 高さの上限（m） */
  heightLimitM: number | null
  notificationNumber: string | null
  /** 範囲（面の集まり。面どうしは重なってよく、どれかに入れば区域内） */
  polygons: Polygon[]
}

/** 環（緯度・経度）。閉じた輪でも、閉じていない輪でもよい */
export type Ring = { lat: number; lon: number }[]

/** 一つの面（gml:Polygon）。外環の中から、穴（gml:interior）を除いたものが面 */
export interface Polygon {
  exterior: Ring
  holes: Ring[]
}

export function tagText(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<urf:${name}(?:\\s[^>]*)?>([^<]*)</urf:${name}>`))
  return m ? m[1]!.trim() : null
}

/** タグの文字。無い、または "Null"（元データで値が無いことを表す）は null（未取得） */
export function tagTextOrNull(block: string, name: string): string | null {
  const t = tagText(block, name)
  return t === null || t === 'Null' ? null : t
}

export function tagNumber(block: string, name: string): number | null {
  const t = tagText(block, name)
  if (t === null || !/^-?\d+(\.\d+)?$/.test(t)) return null
  return Number(t)
}

export function parseUseDistricts(xml: string): UseDistrict[] {
  const starts = [...xml.matchAll(/<urf:UseDistrict\s+gml:id="([^"]+)"\s*>/g)]
  return starts.map((m) => {
    const from = m.index!
    const to = xml.indexOf('</urf:UseDistrict>', from)
    const block = xml.slice(from, to < 0 ? undefined : to)
    return {
      id: m[1]!,
      function: tagNumber(block, 'function'),
      floorAreaRatePercent: tagNumber(block, 'floorAreaRate'),
      buildingCoverageRatePercent: tagNumber(block, 'buildingCoverageRate'),
      heightLimitM: tagNumber(block, 'buildingHeightLimits'),
      notificationNumber: tagTextOrNull(block, 'notificationNumber'),
      polygons: polygonsOf(block),
    }
  })
}

// 点が辺の上にあるか（端点を含む）
function onEdge(p: { lat: number; lon: number }, a: { lat: number; lon: number }, b: { lat: number; lon: number }): boolean {
  const cross = (b.lon - a.lon) * (p.lat - a.lat) - (b.lat - a.lat) * (p.lon - a.lon)
  if (cross !== 0) return false
  return Math.min(a.lon, b.lon) <= p.lon && p.lon <= Math.max(a.lon, b.lon) && Math.min(a.lat, b.lat) <= p.lat && p.lat <= Math.max(a.lat, b.lat)
}

// 点が環の内側か（境界上は false）
export function insideRing(p: { lat: number; lon: number }, ring: { lat: number; lon: number }[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!
    const b = ring[j]!
    if (onEdge(p, a, b)) return false
    if (a.lat > p.lat !== b.lat > p.lat && p.lon < ((b.lon - a.lon) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lon) inside = !inside
  }
  return inside
}

// 環の文字（posList）から、緯度・経度の環を作る。次元（srsDimension）ごとに、緯度と経度だけを読む（実データは 3）
function ringOfPosList(text: string, dim: number): Ring {
  const nums = text.trim().split(/\s+/).map(Number)
  const ring: Ring = []
  for (let k = 0; k + 1 < nums.length; k += dim) ring.push({ lat: nums[k]!, lon: nums[k + 1]! })
  return ring
}

/** 区域の面（gml:Polygon）を、外環と穴の組で読む。外環が無い面は捨てる */
export function polygonsOf(block: string): Polygon[] {
  const dimMatch = block.match(/srsDimension="(\d+)"/)
  const dim = dimMatch ? Number(dimMatch[1]) : 2
  const out: Polygon[] = []
  for (const m of block.matchAll(/<gml:Polygon[\s>][\s\S]*?<\/gml:Polygon>/g)) {
    const poly = m[0]
    const ext = poly.match(/<gml:exterior>[\s\S]*?<gml:posList>([^<]*)<\/gml:posList>/)
    if (!ext) continue
    const holes = [...poly.matchAll(/<gml:interior>[\s\S]*?<gml:posList>([^<]*)<\/gml:posList>/g)].map((h) => ringOfPosList(h[1]!, dim))
    out.push({ exterior: ringOfPosList(ext[1]!, dim), holes })
  }
  return out
}

// 点が環の上にあるか（端点を含む）
function onRing(p: { lat: number; lon: number }, ring: Ring): boolean {
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    if (onEdge(p, ring[i]!, ring[j]!)) return true
  }
  return false
}

// 点が一つの面の中か。外環の内側で、穴の中にも穴の上にもない（境界上は含めない）
function insidePolygon(p: { lat: number; lon: number }, poly: Polygon): boolean {
  if (!insideRing(p, poly.exterior)) return false
  return poly.holes.every((h) => !insideRing(p, h) && !onRing(p, h))
}

/** 点が区域の中か。面のどれかに入れば区域内（穴の中・穴の上は区域外） */
export function insideDistrict(p: { lat: number; lon: number }, polygons: readonly Polygon[]): boolean {
  return polygons.some((poly) => insidePolygon(p, poly))
}

export function districtsAt(districts: UseDistrict[], point: { lat: number; lon: number }): UseDistrict[] {
  return districts.filter((d) => insideDistrict(point, d.polygons))
}
