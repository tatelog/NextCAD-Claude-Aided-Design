// 筆の識別子。筆IDは地図（シート）の中でしか一意でないので、地図名と組み合わせる
export function parcelUid(p: { 地図名: string; 筆ID: string }): string {
  return `${p.地図名}|${p.筆ID}`
}

// 選択した筆の情報の文（情報欄に出す）。精度区分がないときは「不明」。
export type ParcelProps = Record<string, string | null | undefined>

export function formatParcelInfo(p: ParcelProps): string {
  const place = `${p['大字名'] ?? ''}${p['丁目名'] ?? ''}`
  const accuracy = p['精度区分'] ? p['精度区分'] : '不明'
  return `選択した筆：地番 ${p['地番']}（${place}）、精度区分 ${accuracy}、地図名 ${p['地図名']}`
}
