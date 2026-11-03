// PLATEAU の urf の防火地域（FirePreventionDistrict）と高度地区（HeightControlDistrict）を解析する（D-02 C4・C11、A-03 G28、ハブ E-80・E-82）。
// 構造は 2026-11-03 に江東区のメッシュ 533946 の GML で確認。値が無い・数字でなければ null。
// 防火の区分（function）: 24 防火地域、25 準防火地域。用途（usage）: 1 防火地域（地域）、2 防火地域（路線）、3 準防火地域（地域）、4 準防火地域（路線）。
// 高度地区（function）: 18。最高・最低の高さ（m）は urf:maximumBuildingHeight / urf:minimumBuildingHeight。
import { insideRing, tagNumber, tagText } from './urf'

export interface FireDistrict {
  id: string
  /** 管理者（区名、「東京都」、または不明は null） */
  custodian: string | null
  function: number | null
  usage: number | null
  notificationNumber: string | null
  ring: { lat: number; lon: number }[]
}

export interface HeightDistrict {
  id: string
  /** 管理者（区名、「東京都」、または不明は null） */
  custodian: string | null
  function: number | null
  maximumBuildingHeightM: number | null
  minimumBuildingHeightM: number | null
  notificationNumber: string | null
  ring: { lat: number; lon: number }[]
}

function ringOf(block: string): { lat: number; lon: number }[] {
  const pos = block.match(/<gml:posList>([^<]*)<\/gml:posList>/)
  const nums = pos ? pos[1]!.trim().split(/\s+/).map(Number) : []
  const dimMatch = block.match(/srsDimension="(\d+)"/)
  const dim = dimMatch ? Number(dimMatch[1]) : 2
  const ring: { lat: number; lon: number }[] = []
  for (let k = 0; k + 1 < nums.length; k += dim) ring.push({ lat: nums[k]!, lon: nums[k + 1]! })
  return ring
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
    notificationNumber: tagText(block, 'notificationNumber'),
    ring: ringOf(block),
  }))
}

export function parseHeightControlDistricts(xml: string): HeightDistrict[] {
  return blocksOf(xml, 'HeightControlDistrict').map(({ id, block }) => ({
    id,
    function: tagNumber(block, 'function'),
    maximumBuildingHeightM: tagNumber(block, 'maximumBuildingHeight'),
    minimumBuildingHeightM: tagNumber(block, 'minimumBuildingHeight'),
    custodian: tagText(block, 'custodian'),
    notificationNumber: tagText(block, 'notificationNumber'),
    ring: ringOf(block),
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

export function districtsAtPoint<T extends { ring: { lat: number; lon: number }[] }>(
  districts: T[],
  point: { lat: number; lon: number },
): T[] {
  return districts.filter((d) => d.ring.length >= 3 && insideRing(point, d.ring))
}
