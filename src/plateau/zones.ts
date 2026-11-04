// PLATEAU の urf の防火地域（FirePreventionDistrict）と高度地区（HeightControlDistrict）を解析する（D-02 C4・C11、A-03 G28、ハブ E-80・E-82）。
// 構造は 2026-11-03 に江東区のメッシュ 533946 の GML で確認。値が無い・数字でなければ null。告示番号の "Null" は未取得。
// 防火の区分（function）: 24 防火地域、25 準防火地域。用途（usage）: 1 防火地域（地域）、2 防火地域（路線）、3 準防火地域（地域）、4 準防火地域（路線）。
// 高度地区（function）: 18。最高・最低の高さ（m）は urf:maximumBuildingHeight / urf:minimumBuildingHeight。
// 範囲は面の集まり（外環から穴を除いた面。穴の中の点は区域外。統括の t68・2026-11-05）。
import { insideDistrict, polygonsOf, tagNumber, tagText, tagTextOrNull, type Polygon } from './urf'

export interface FireDistrict {
  id: string
  /** 管理者（区名、「東京都」、または不明は null） */
  custodian: string | null
  function: number | null
  usage: number | null
  notificationNumber: string | null
  /** 範囲（面の集まり） */
  polygons: Polygon[]
}

export interface HeightDistrict {
  id: string
  /** 管理者（区名、「東京都」、または不明は null） */
  custodian: string | null
  function: number | null
  maximumBuildingHeightM: number | null
  minimumBuildingHeightM: number | null
  notificationNumber: string | null
  /** 範囲（面の集まり） */
  polygons: Polygon[]
}

function blocksOf(xml: string, tag: string): { id: string; block: string }[] {
  const starts = [...xml.matchAll(new RegExp(`<urf:${tag}\\s+gml:id="([^"]+)"\\s*>`, 'g'))]
  return starts.map((m) => {
    const from = m.index!
    const to = xml.indexOf(`</urf:${tag}>`, from)
    return { id: m[1]!, block: xml.slice(from, to < 0 ? undefined : to) }
  })
}

export function parseFirePreventionDistricts(xml: string): FireDistrict[] {
  return blocksOf(xml, 'FirePreventionDistrict').map(({ id, block }) => ({
    id,
    function: tagNumber(block, 'function'),
    usage: tagNumber(block, 'usage'),
    custodian: tagText(block, 'custodian'),
    notificationNumber: tagTextOrNull(block, 'notificationNumber'),
    polygons: polygonsOf(block),
  }))
}

export function parseHeightControlDistricts(xml: string): HeightDistrict[] {
  return blocksOf(xml, 'HeightControlDistrict').map(({ id, block }) => ({
    id,
    function: tagNumber(block, 'function'),
    maximumBuildingHeightM: tagNumber(block, 'maximumBuildingHeight'),
    minimumBuildingHeightM: tagNumber(block, 'minimumBuildingHeight'),
    custodian: tagText(block, 'custodian'),
    notificationNumber: tagTextOrNull(block, 'notificationNumber'),
    polygons: polygonsOf(block),
  }))
}

// 用途コード → 区分と用途（urf の FirePreventionDistrict_usage、2026-11-03 に確認）。知らないコードは弾く。
export function fireKind(usage: number): { kind: '防火地域' | '準防火地域'; scope: '地域' | '路線' } {
  switch (usage) {
    case 1:
      return { kind: '防火地域', scope: '地域' }
    case 2:
      return { kind: '防火地域', scope: '路線' }
    case 3:
      return { kind: '準防火地域', scope: '地域' }
    case 4:
      return { kind: '準防火地域', scope: '路線' }
    default:
      throw new Error(`知らない防火地域の用途コード: ${usage}`)
  }
}

// 区分（function。24 防火地域・25 準防火地域）と、用途（usage）が食い違うか。両方そろわないものは食い違いとは言わない（未取得のまま）。
// 食い違いの印だけを出し、直さない（判定は区分で行う。統括の t68・2026-11-05）。
export function fireUsageMismatch(d: { function: number | null; usage: number | null }): boolean {
  if (d.function === null || d.usage === null) return false
  const areaKind = d.function === 24 ? '防火地域' : d.function === 25 ? '準防火地域' : null
  if (areaKind === null || ![1, 2, 3, 4].includes(d.usage)) return false
  return fireKind(d.usage).kind !== areaKind
}

export function districtsAtPoint<T extends { polygons: readonly Polygon[] }>(districts: T[], point: { lat: number; lon: number }): T[] {
  return districts.filter((d) => insideDistrict(point, d.polygons))
}
