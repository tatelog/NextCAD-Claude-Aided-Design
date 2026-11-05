// 江東区の日影の一覧（shadowOrdinanceKoto.json）を、丁目の名前から引く（ハブ A-07 E-87・E-45、t34、区訂正図 t23）。決定論。
// 区の訂正図と食い違う K1・K2 は、値を確定扱いにせず「要確認」。町丁目名だけの区域は、地番の範囲が未確認なので全域へ広げず「要確認」。
// 丁目が分からないときは「丁目が未確認」（区域に当たるかを確かめられない）。どれにも当たらなければ江東区の全域の規定。
import koto from './shadowOrdinanceKoto.json'

export type KotoArea =
  | { kind: 'unknown'; reason: string }
  | { kind: 'confirm'; ref: string; reason: string }
  | { kind: 'town-only'; ref: string; reason: string }
  | { kind: 'general'; reason: string }

interface AreaEntry {
  id: string
  areas: string
}

const data = koto as unknown as { areas: AreaEntry[]; exclusions: AreaEntry[] }

/** 区域の文（丁目の名前が続く）から、丁目の名前だけを取り出す（例: 「平野一丁目1番及び深川二丁目23番」→ 平野一丁目・深川二丁目） */
function chomesOf(text: string): string[] {
  return [...text.matchAll(/[^、及び（(\d]+?丁目/g)].map((m) => m[0])
}

/** 丁目の名前から、江東区の一覧での扱いを決める。K1・K2 を先に当て、次に町丁目だけの区域（区域の表と除外の表）を当てる */
export function koutoAreaOf(chome: string | null): KotoArea {
  if (chome === null || chome.trim() === '') {
    return { kind: 'unknown', reason: '丁目が未確認（区域の一覧に当たるかを確かめられない）' }
  }
  const name = chome.trim()
  const k = data.areas.find((a) => (a.id === 'K1' || a.id === 'K2') && chomesOf(a.areas).includes(name))
  if (k) return { kind: 'confirm', ref: k.id, reason: `${k.id}: 区の訂正図と食い違うため、値を確定扱いにせず要確認（t23）` }
  // 町丁目の一覧は、K1・K2 以外の区域（別表三22・三21 の id は K1- や R- で始まる）と除外の表
  const towns = [...data.areas.filter((a) => a.id !== 'K1' && a.id !== 'K2'), ...data.exclusions]
  const t = towns.find((a) => chomesOf(a.areas).includes(name))
  if (t) return { kind: 'town-only', ref: t.id, reason: `${t.id}: 町丁目名だけの区域（地番の範囲は未確認）。全域へ広げず要確認` }
  return { kind: 'general', reason: '区域の一覧に当たらない（江東区の全域の規定を使う）' }
}
