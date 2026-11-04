// 郵便番号から住所を引き、住所検索（国土地理院）で経緯度の候補にする。
// 郵便番号 → 住所の引き当ては外から渡す（データの出どころは未決め。利用条件を確認してから決める）。
import type { AddressCandidate } from './gsiAddress'

export type PostalDeps = {
  lookupAddresses: (code7: string) => Promise<string[]>
  searchAddr: (query: string) => Promise<AddressCandidate[]>
}

// 〒・ハイフン・空白を取り、7 桁の数字にする
export function normalizePostalCode(input: string): string {
  const digits = input.replace(/〒/g, '').replace(/[\s-]/g, '')
  if (!/^\d{7}$/.test(digits)) throw new Error('郵便番号は7桁の数字で入力してください')
  return digits
}

export async function searchPostal(input: string, deps: PostalDeps): Promise<AddressCandidate[]> {
  const code = normalizePostalCode(input)
  const addresses = await deps.lookupAddresses(code)
  const seen = new Map<string, AddressCandidate>()
  for (const address of addresses) {
    for (const c of await deps.searchAddr(address)) {
      seen.set(`${c.title}|${c.lon}|${c.lat}`, c)
    }
  }
  return [...seen.values()]
}
