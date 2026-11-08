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

const KANJI_DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const

/** 1 以上 99 以下の数を漢数字にする（十・十一・二十） */
function kanjiOf(n: number): string {
  if (n < 10) return KANJI_DIGITS[n] ?? ''
  const tens = Math.floor(n / 10)
  return `${tens > 1 ? (KANJI_DIGITS[tens] ?? '') : ''}十${KANJI_DIGITS[n % 10] ?? ''}`
}

/** 丁目名（「２丁目」）を、漢数字の丁目（「二丁目」）にする。丁目名が無いときは空、形が違えばそのまま */
function chomeOf(name: string | null | undefined): string {
  if (!name) return ''
  const m = /^([0-9０-９]+)丁目$/.exec(name)
  if (!m) return name
  const n = Number(m[1]!.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)))
  return `${kanjiOf(n)}丁目`
}

/** 地名地番（「江東区新砂二丁目625番1」の形）。市区町村名・大字名・丁目名・地番（「-」は「番」）。地番が無ければ null（統括の依頼 2026-11-06。2） */
export function chibanOf(p: ParcelProps): string | null {
  const chiban = p['地番']
  if (!chiban) return null
  const [main = '', sub] = chiban.split('-')
  const ban = sub !== undefined && sub !== '' ? `${main}番${sub}` : `${main}番`
  return `${p['市区町村名'] ?? ''}${p['大字名'] ?? ''}${chomeOf(p['丁目名'])}${ban}`
}

/** 丁目の名前（大字名と丁目。例「新砂二丁目」）。江東区の一覧を引く名前（統括の依頼 2026-11-06）。大字名か丁目名が無いときは null */
export function chomeNameOf(p: ParcelProps): string | null {
  const oaza = p['大字名']
  const chome = p['丁目名']
  if (!oaza || !chome) return null
  return `${oaza}${chomeOf(chome)}`
}
