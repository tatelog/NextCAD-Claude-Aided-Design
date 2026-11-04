// 什器（ハブ A-03 G69・G13、D-04 P2・P3）。道具の「什器」は P3 で使い、置いた什器は P4 の数量に結ぶ。
// ここは決定論の処理だけ（置く・外す・数える）。入力は書き換えない。画面（P3・P4）と店舗は、この関数を呼ぶ。
// パレットの中身と什器の kind は D-04 で未決。次は仮置き:
//   - 品目は案の 5 つ（キッチン・ユニットバス・洗面・便器・収納）
//   - kind は「その他」、属性に「什器」を持つ（G13: 設備・階段・EV・什器は「その他」の属性）
import type { Kind } from './semantic'

export const FIXTURE_ITEMS = [
  { id: 'kitchen', label: 'キッチン' },
  { id: 'unit_bath', label: 'ユニットバス' },
  { id: 'washbasin', label: '洗面' },
  { id: 'toilet', label: '便器' },
  { id: 'storage', label: '収納' },
] as const

export type FixtureItem = (typeof FIXTURE_ITEMS)[number]['id']

/** 什器の kind は「その他」（G13） */
export const FIXTURE_KIND: Kind = 'other'
/** 什器が持つ属性（G13） */
export const FIXTURE_ATTRIBUTE = '什器'

export interface Fixture {
  id: string
  /** 種類（品目） */
  item: FixtureItem
  /** 置いた区画（住戸の区画候補）の id。区画が無いときは null */
  unitId: string | null
}

export interface FixtureCounts {
  /** 種類ごとの件数（区画の指定あり）。5 品目すべてのキーを持つ（0 件は 0） */
  byItem: Record<FixtureItem, number>
  /** 区画なしの件数。区画の id が null の什器と、現在ある区画に無い什器（種類は問わない） */
  unassigned: number
}

export function fixtureLabel(item: FixtureItem): string {
  return FIXTURE_ITEMS.find((i) => i.id === item)?.label ?? item
}

const ID_PATTERN = /^fixture-(\d+)$/

// 残っている什器の id の連番のうち、最大の番号。連番の id が無ければ 0。
function maxSerial(fixtures: readonly Fixture[]): number {
  let max = 0
  for (const f of fixtures) {
    const m = ID_PATTERN.exec(f.id)
    if (m) max = Math.max(max, Number(m[1] ?? '0'))
  }
  return max
}

/** 種類と区画の id を渡すと、一覧の終わりに什器を 1 つ足した新しい一覧を返す。id は「残っている最大の番号 + 1」の連番（乱数・時刻は使わない） */
export function placeFixture(fixtures: readonly Fixture[], item: FixtureItem, unitId: string): Fixture[] {
  return [...fixtures, { id: `fixture-${maxSerial(fixtures) + 1}`, item, unitId }]
}

/** id で 1 つ消した新しい一覧を返す。一覧に無い id なら、同じ中身の新しい一覧を返す */
export function removeFixture(fixtures: readonly Fixture[], id: string): Fixture[] {
  const index = fixtures.findIndex((f) => f.id === id)
  if (index < 0) return [...fixtures]
  return [...fixtures.slice(0, index), ...fixtures.slice(index + 1)]
}

function emptyCountsByItem(): Record<FixtureItem, number> {
  return { kitchen: 0, unit_bath: 0, washbasin: 0, toilet: 0, storage: 0 }
}

/**
 * 種類ごとの件数（区画の指定あり）と、区画なしの件数を数える。どの什器も落とさない。
 * 区画の id が null の什器は区画なし。現在ある区画の id（unitIds）を渡したときは、その中に無い区画の什器も区画なし。
 */
export function countFixtures(fixtures: readonly Fixture[], unitIds?: readonly string[]): FixtureCounts {
  const byItem = emptyCountsByItem()
  const existing = unitIds === undefined ? null : new Set(unitIds)
  let unassigned = 0
  for (const f of fixtures) {
    const hasUnit = f.unitId !== null && (existing === null || existing.has(f.unitId))
    if (hasUnit) byItem[f.item] += 1
    else unassigned += 1
  }
  return { byItem, unassigned }
}
