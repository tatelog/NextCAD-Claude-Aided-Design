// 什器の単価と、工事原価（概算）に入れる金額（ハブ A-03 G69・G19・G22、D-04 P4）。決定論の処理だけ（読む・数える・掛ける・足す）。入力は書き換えない。
// 置いた什器に単価（円/台）を入れると、台数 × 単価が工事原価（概算）の合計に入る。単価に出典はないので、入れた行は「出典なしの仮置き」（G22）。
// 単価が空欄の品目は合計に入れない（未確定）。区画は金額に関係しない（区画なしの什器も台数に数える）。
// 仮置き（D-04 未決）: 単価は 0 以上の整数（円）だけを読む。注記は、合計に入れていない什器があるときだけ出す。
// 工事原価（概算）には、fixtureCostLines の行を estimateCost の 3 つ目の引数に渡して入れる。区分は「内装」（仮置き）。
import { FIXTURE_ITEMS, fixtureLabel, type Fixture, type FixtureItem } from '../plan/fixtures'
import type { AmountLine, Category } from './estimate'

/** 品目ごとの単価（円/台）。空欄（未確定）は null か、キーが無いこと */
export type FixtureUnitPrices = Partial<Record<FixtureItem, number | null>>

/** 品目ごとの、単価の入力欄の文字 */
export type FixtureUnitPriceTexts = Partial<Record<FixtureItem, string>>

export interface FixtureCostRow {
  item: FixtureItem
  /** 品目の表示名 */
  label: string
  /** 置いた台数。区画の指定の有無は問わない（区画なしの什器も数える） */
  count: number
  /** 単価（円/台）。空欄（未確定）なら null */
  unitPrice: number | null
  /** 金額（円）= 台数 × 単価。単価が空欄なら null（合計に入れない） */
  amount: number | null
  /** 出典なしの仮置き（G22）。単価を入れた行（金額がある行）だけ true */
  provisional: boolean
}

export interface FixtureCost {
  /** 5 品目すべての行（FIXTURE_ITEMS の順） */
  rows: FixtureCostRow[]
  /** 合計（円）= 単価を入れた品目の金額の合計 */
  total: number
  /** 合計に入れていない品目 = 台数が 1 以上で、単価が空欄の品目（FIXTURE_ITEMS の順） */
  unpriced: FixtureItem[]
  /** 注記。合計に入れていない品目があるときだけ。無ければ null */
  note: string | null
}

export const FIXTURE_UNPRICED_NOTE = '単価が未入力の什器は合計に入れていない（未確定）'

/** 什器の金額を入れる区分（仮置き）。キッチン・ユニットバス・洗面・便器・収納は、内装の設備として拾う */
export const FIXTURE_COST_CATEGORY: Category = '内装'

/**
 * 入力欄の文字を、0 以上の整数（円）か、未確定（null）に読む。空欄・空白だけは未確定。
 * 前後の空白、桁区切りのカンマ（半角・全角）、全角の数字は読める。数として読めないもの（小数・負・単位つき・安全な整数を超える桁）は未確定。
 */
export function parseUnitPrice(text: string): number | null {
  // 全角の数字・カンマ・空白を半角にそろえてから、桁区切りのカンマを落とす
  const digits = text.normalize('NFKC').replace(/,/g, '').trim()
  if (!/^\d+$/.test(digits)) return null
  const value = Number(digits)
  return Number.isSafeInteger(value) ? value : null
}

/** 品目ごとの入力欄の文字を、まとめて読む。5 品目すべてのキーを返す（入力の無い品目は null）。入力を省略すると、すべて null */
export function parseUnitPrices(texts: FixtureUnitPriceTexts = {}): Record<FixtureItem, number | null> {
  const read = (item: FixtureItem): number | null => parseUnitPrice(texts[item] ?? '')
  return {
    kitchen: read('kitchen'),
    unit_bath: read('unit_bath'),
    washbasin: read('washbasin'),
    toilet: read('toilet'),
    storage: read('storage'),
  }
}

// 単価として使えるのは、0 以上の整数だけ。それ以外（null・省略・負・小数・NaN・無限大）は空欄と同じ
function validPrice(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

/**
 * 置いた什器と品目ごとの単価から、品目ごとの行（台数・単価・金額）、合計、合計に入れていない品目、注記を求める。
 * 単価を入れた品目は、金額 = 台数 × 単価を合計に入れる。単価が空欄の品目は合計に入れない。
 */
export function estimateFixtureCost(fixtures: readonly Fixture[], unitPrices: FixtureUnitPrices): FixtureCost {
  const rows: FixtureCostRow[] = FIXTURE_ITEMS.map(({ id }) => {
    const count = fixtures.filter((f) => f.item === id).length
    const unitPrice = validPrice(unitPrices[id])
    const amount = unitPrice === null ? null : count * unitPrice
    return { item: id, label: fixtureLabel(id), count, unitPrice, amount, provisional: amount !== null }
  })
  const total = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0)
  const unpriced = rows.filter((r) => r.count > 0 && r.unitPrice === null).map((r) => r.item)
  return { rows, total, unpriced, note: unpriced.length > 0 ? FIXTURE_UNPRICED_NOTE : null }
}

/**
 * 工事原価（概算）に渡す行（estimateCost の 3 つ目の引数）。単価を入れて、1 台以上置いた品目だけが行になる（品目の並び）。
 * 区分は FIXTURE_COST_CATEGORY、金額は 台数 × 単価、出典なしの仮置きの印（provisional）付き。
 */
export function fixtureCostLines(cost: FixtureCost): AmountLine[] {
  return cost.rows.flatMap((r) =>
    r.amount !== null && r.count > 0 ? [{ id: `fixture:${r.item}`, category: FIXTURE_COST_CATEGORY, yen: r.amount, provisional: r.provisional }] : [],
  )
}
