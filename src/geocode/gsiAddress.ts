// 国土地理院の住所検索 API で、住所文字列から候補（住所名と経緯度）を得る。
// 応答の形は実 API で確認済み（東京都江東区東陽4-11-28 → 経度 139.81636、緯度 35.672993）。
import { z } from 'zod'

export const GSI_ADDRESS_SEARCH_URL = 'https://msearch.gsi.go.jp/address-search/AddressSearch'

export type AddressCandidate = { title: string; lon: number; lat: number }

// 座標は [経度, 緯度] の順
const ResponseSchema = z.array(
  z.object({
    geometry: z.object({ type: z.literal('Point'), coordinates: z.tuple([z.number(), z.number()]) }),
    properties: z.object({ title: z.string() }),
  }),
)

export function addressSearchUrl(query: string): string {
  return `${GSI_ADDRESS_SEARCH_URL}?q=${encodeURIComponent(query)}`
}

export function parseAddressSearch(json: unknown): AddressCandidate[] {
  return ResponseSchema.parse(json).map((f) => ({
    title: f.properties.title,
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }))
}

export async function searchAddress(query: string, fetchFn: typeof fetch = fetch): Promise<AddressCandidate[]> {
  const q = query.trim()
  if (q === '') return []
  const res = await fetchFn(addressSearchUrl(q))
  if (!res.ok) throw new Error(`住所検索が失敗しました（HTTP ${res.status}）`)
  return parseAddressSearch(await res.json())
}
