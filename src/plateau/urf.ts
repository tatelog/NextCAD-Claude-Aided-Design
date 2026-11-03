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
  /** 範囲の外環（緯度・経度） */
  ring: { lat: number; lon: number }[]
}

function tagText(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<urf:${name}(?:\\s[^>]*)?>([^<]*)</urf:${name}>`))
  return m ? m[1]!.trim() : null
}

function tagNumber(block: string, name: string): number | null {
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
    const pos = block.match(/<gml:posList>([^<]*)<\/gml:posList>/)
    const nums = pos ? pos[1]!.trim().split(/\s+/).map(Number) : []
    const ring: { lat: number; lon: number }[] = []
    for (let k = 0; k + 1 < nums.length; k += 2) ring.push({ lat: nums[k]!, lon: nums[k + 1]! })
    return {
      id: m[1]!,
      function: tagNumber(block, 'function'),
      floorAreaRatePercent: tagNumber(block, 'floorAreaRate'),
      buildingCoverageRatePercent: tagNumber(block, 'buildingCoverageRate'),
      heightLimitM: tagNumber(block, 'buildingHeightLimits'),
      notificationNumber: tagText(block, 'notificationNumber'),
      ring,
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
function insideRing(p: { lat: number; lon: number }, ring: { lat: number; lon: number }[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!
    const b = ring[j]!
    if (onEdge(p, a, b)) return false
    if (a.lat > p.lat !== b.lat > p.lat && p.lon < ((b.lon - a.lon) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lon) inside = !inside
  }
  return inside
}

export function districtsAt(districts: UseDistrict[], point: { lat: number; lon: number }): UseDistrict[] {
  return districts.filter((d) => d.ring.length >= 3 && insideRing(point, d.ring))
}
