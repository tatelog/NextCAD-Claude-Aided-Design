// 仕様（ハブ A-03 G69・G19・G22、D-04 P4）: 置いた什器に単価（円/台）を入れると、台数 × 単価が工事原価（概算）に入る。
// 出典のない単価は仮置き（G22）なので、入れた行には「出典なしの仮置き」の印（provisional）が付く。
// 仕様 1: 単価の読み方 — 入力欄の文字を、0 以上の整数（円）か、未確定（null）に読む。空欄は未確定。
//         品目ごとの入力欄の文字（5 品目分）を、まとめて読める。
// 仕様 2: 行 — 5 品目すべての行を、品目の並び（キッチン・ユニットバス・洗面・便器・収納）で返す。
//         台数はその品目の什器の数。区画の指定の有無は問わない（区画なしの什器も数える。区画は金額に関係しない）。
// 仕様 3: 単価を入れた品目は、金額 = 台数 × 単価。行に「出典なしの仮置き」の印が付く。0 円も入れた単価。
// 仕様 4: 単価が空欄の品目は、金額なし（null）で、合計に入れない。0 以上の整数でない単価も空欄と同じ。
// 仕様 5: 合計 = 単価を入れた品目の金額の合計。
// 仕様 6: 注記 — 置いた什器のうち、単価が空欄の品目のものがあるときだけ、「単価が未入力の什器は合計に入れていない（未確定）」を返す。
//         合計に入れていない品目（台数が 1 以上で単価が空欄のもの）も、品目の並びで返す。
// 仕様 7: どの操作も、入力は書き換えない。同じ入力は同じ結果になる。
// 仕様 8: 工事原価（概算）に渡す行 — 単価を入れて、1 台以上置いた品目だけが行になる（空欄・台数 0 の品目は行にならない）。
//         行は区分「内装」（仮置き）、金額 = 台数 × 単価、出典なしの仮置きの印付き。estimateCost に渡すと、合計・内装の小計・未確定の印に入る。
import { describe, expect, it } from 'vitest'
import { FIXTURE_ITEMS } from '../plan/fixtures'
import type { Fixture, FixtureItem } from '../plan/fixtures'
import { estimateCost } from './estimate'
import { estimateFixtureCost, fixtureCostLines, parseUnitPrice, parseUnitPrices } from './fixtureCost'

// 品目は表示名（仕様の言葉）で引く。id の綴りには依存しない。
function itemOf(label: string): FixtureItem {
  const found = FIXTURE_ITEMS.find((i) => i.label === label)
  if (!found) throw new Error(`品目「${label}」が無い`)
  return found.id
}

const kitchen = itemOf('キッチン')
const unitBath = itemOf('ユニットバス')
const washbasin = itemOf('洗面')
const toilet = itemOf('便器')
const storage = itemOf('収納')

const NOTE = '単価が未入力の什器は合計に入れていない（未確定）'

type Prices = Partial<Record<FixtureItem, number | null>>
type Texts = Partial<Record<FixtureItem, string>>
type Cost = ReturnType<typeof estimateFixtureCost>

function prices(...entries: Array<[FixtureItem, number | null]>): Prices {
  const out: Prices = {}
  for (const [item, price] of entries) out[item] = price
  return out
}

function texts(...entries: Array<[FixtureItem, string]>): Texts {
  const out: Texts = {}
  for (const [item, text] of entries) out[item] = text
  return out
}

function fx(serial: number, item: FixtureItem, unitId: string | null = 'cell-1'): Fixture {
  return { id: `fixture-${serial}`, item, unitId }
}

function rowOf(cost: Cost, item: FixtureItem): Cost['rows'][number] {
  const row = cost.rows.find((r) => r.item === item)
  if (!row) throw new Error(`品目 ${item} の行が無い`)
  return row
}

// 中身も一覧も凍結する。書き換えようとすれば、その場で例外になる。
function freeze(list: readonly Fixture[]): readonly Fixture[] {
  return Object.freeze(list.map((f) => Object.freeze({ ...f })))
}

describe('単価の読み方（仕様 1）', () => {
  it('空欄は未確定（null）', () => {
    expect(parseUnitPrice('')).toBeNull()
  })

  it('空白だけも空欄と同じ（未確定）', () => {
    expect(parseUnitPrice('   ')).toBeNull()
    expect(parseUnitPrice('　')).toBeNull()
  })

  it('0 以上の整数は、その数（円）', () => {
    expect(parseUnitPrice('450000')).toBe(450000)
    expect(parseUnitPrice('1')).toBe(1)
  })

  it('0 は入れた単価（0 円）で、未確定ではない', () => {
    expect(parseUnitPrice('0')).toBe(0)
  })

  it('前後の空白は読み飛ばす', () => {
    expect(parseUnitPrice(' 450000 ')).toBe(450000)
  })

  it('桁区切りのカンマ（半角・全角）は読み飛ばす', () => {
    expect(parseUnitPrice('450,000')).toBe(450000)
    expect(parseUnitPrice('４５０，０００')).toBe(450000)
  })

  it('全角の数字も読める', () => {
    expect(parseUnitPrice('４５００００')).toBe(450000)
  })

  it.each(['abc', '-1', '1.5', '1e3', '12円', '1 000', '+5'])('数として読めない「%s」は未確定（null）', (text) => {
    expect(parseUnitPrice(text)).toBeNull()
  })

  it('安全に扱える整数を超える桁は未確定（null）', () => {
    expect(parseUnitPrice('9'.repeat(20))).toBeNull()
  })
})

describe('品目ごとの入力欄の文字を、まとめて読む（仕様 1）', () => {
  it('入力が空でも、5 品目すべてのキーを持ち、どれも未確定（null）', () => {
    const p = parseUnitPrices({})
    expect(Object.keys(p).sort()).toEqual(FIXTURE_ITEMS.map((i) => i.id).sort())
    expect(Object.values(p).every((v) => v === null)).toBe(true)
  })

  it('入れた品目は読んだ値、空欄や読めない品目と、入力の無い品目は null', () => {
    const p = parseUnitPrices(texts([kitchen, '450,000'], [toilet, ''], [storage, 'abc'], [washbasin, '0']))
    expect(p[kitchen]).toBe(450000)
    expect(p[washbasin]).toBe(0)
    expect(p[toilet]).toBeNull()
    expect(p[storage]).toBeNull()
    expect(p[unitBath]).toBeNull()
  })

  it('入力は書き換えない', () => {
    const input = Object.freeze(texts([kitchen, '450,000']))
    const before = JSON.stringify(input)
    parseUnitPrices(input)
    expect(JSON.stringify(input)).toBe(before)
  })

  it('入力を渡さなくても（省略しても）、5 品目すべてのキーを持ち、どれも未確定（null）', () => {
    for (const p of [parseUnitPrices(), parseUnitPrices(undefined)]) {
      expect(Object.keys(p).sort()).toEqual(FIXTURE_ITEMS.map((i) => i.id).sort())
      expect(Object.values(p).every((v) => v === null)).toBe(true)
    }
  })
})

describe('行（仕様 2）', () => {
  it('何も置かず単価も無ければ、5 品目の行が、台数 0・単価なし・金額なしで並ぶ', () => {
    const cost = estimateFixtureCost([], {})
    expect(cost.rows).toHaveLength(5)
    expect(cost.rows.map((r) => r.item)).toEqual(FIXTURE_ITEMS.map((i) => i.id))
    for (const r of cost.rows) {
      expect(r.count).toBe(0)
      expect(r.unitPrice).toBeNull()
      expect(r.amount).toBeNull()
    }
  })

  it('行の表示名は、キッチン・ユニットバス・洗面・便器・収納の順', () => {
    const cost = estimateFixtureCost([], {})
    expect(cost.rows.map((r) => r.label)).toEqual(['キッチン', 'ユニットバス', '洗面', '便器', '収納'])
  })

  it('置いた順や単価を入れた順に依らず、行は品目の並びで返る', () => {
    const cost = estimateFixtureCost([fx(1, storage), fx(2, kitchen), fx(3, toilet)], prices([toilet, 100], [kitchen, 200]))
    expect(cost.rows.map((r) => r.label)).toEqual(['キッチン', 'ユニットバス', '洗面', '便器', '収納'])
  })

  it('台数は、その品目の什器の数', () => {
    const cost = estimateFixtureCost([fx(1, kitchen), fx(2, kitchen), fx(3, toilet)], {})
    expect(rowOf(cost, kitchen).count).toBe(2)
    expect(rowOf(cost, toilet).count).toBe(1)
    expect(rowOf(cost, unitBath).count).toBe(0)
    expect(rowOf(cost, washbasin).count).toBe(0)
    expect(rowOf(cost, storage).count).toBe(0)
  })

  it('区画なし（区画の id が null）の什器も、台数に数える', () => {
    const cost = estimateFixtureCost([fx(1, kitchen, null), fx(2, kitchen, 'cell-1')], {})
    expect(rowOf(cost, kitchen).count).toBe(2)
  })

  it('どの区画に置いたかは、台数に関係しない', () => {
    const cost = estimateFixtureCost([fx(1, toilet, 'cell-1'), fx(2, toilet, 'cell-2'), fx(3, toilet, 'cell-9'), fx(4, toilet, null)], {})
    expect(rowOf(cost, toilet).count).toBe(4)
  })

  it('どの什器も落とさない（台数の合計 = 什器の数）', () => {
    const list = [fx(1, kitchen), fx(2, unitBath, null), fx(3, toilet, 'cell-9'), fx(4, storage), fx(5, storage, null)]
    const cost = estimateFixtureCost(list, prices([kitchen, 1], [storage, 1]))
    expect(cost.rows.reduce((sum, r) => sum + r.count, 0)).toBe(list.length)
  })
})

describe('金額（仕様 3・4）', () => {
  it('単価を入れた品目は、単価と、金額 = 台数 × 単価を持つ', () => {
    const cost = estimateFixtureCost([fx(1, kitchen), fx(2, kitchen)], prices([kitchen, 450000]))
    const row = rowOf(cost, kitchen)
    expect(row.unitPrice).toBe(450000)
    expect(row.amount).toBe(900000)
  })

  it('単価を入れた行には、出典なしの仮置きの印が付く', () => {
    const cost = estimateFixtureCost([fx(1, kitchen)], prices([kitchen, 450000]))
    expect(rowOf(cost, kitchen).provisional).toBe(true)
  })

  it('単価が空欄（null）の品目は、単価も金額も無く、仮置きの印も付かない', () => {
    const cost = estimateFixtureCost([fx(1, unitBath), fx(2, unitBath)], prices([unitBath, null]))
    const row = rowOf(cost, unitBath)
    expect(row.count).toBe(2)
    expect(row.unitPrice).toBeNull()
    expect(row.amount).toBeNull()
    expect(row.provisional).toBe(false)
  })

  it('単価の指定が無い（省略した）品目も、空欄と同じ', () => {
    const cost = estimateFixtureCost([fx(1, toilet)], prices([kitchen, 450000]))
    const row = rowOf(cost, toilet)
    expect(row.unitPrice).toBeNull()
    expect(row.amount).toBeNull()
    expect(row.provisional).toBe(false)
  })

  it('0 円の単価は入れた単価で、金額は 0 円、仮置きの印が付く', () => {
    const cost = estimateFixtureCost([fx(1, storage), fx(2, storage)], prices([storage, 0]))
    const row = rowOf(cost, storage)
    expect(row.unitPrice).toBe(0)
    expect(row.amount).toBe(0)
    expect(row.provisional).toBe(true)
  })

  it('台数が 0 の品目に単価を入れても、金額は 0 円', () => {
    const cost = estimateFixtureCost([], prices([washbasin, 80000]))
    const row = rowOf(cost, washbasin)
    expect(row.count).toBe(0)
    expect(row.unitPrice).toBe(80000)
    expect(row.amount).toBe(0)
  })

  it.each([[-1], [Number.NaN], [1.5], [Number.POSITIVE_INFINITY]])('0 以上の整数でない単価（%s）は、空欄と同じ（未確定）', (bad) => {
    const cost = estimateFixtureCost([fx(1, kitchen)], prices([kitchen, bad]))
    const row = rowOf(cost, kitchen)
    expect(row.unitPrice).toBeNull()
    expect(row.amount).toBeNull()
    expect(row.provisional).toBe(false)
    expect(cost.total).toBe(0)
  })
})

describe('合計（仕様 5）', () => {
  it('何も置かず単価も無ければ 0', () => {
    expect(estimateFixtureCost([], {}).total).toBe(0)
  })

  it('単価を入れた品目の金額の合計になる', () => {
    const list = [fx(1, kitchen), fx(2, kitchen), fx(3, toilet), fx(4, toilet), fx(5, toilet)]
    const cost = estimateFixtureCost(list, prices([kitchen, 450000], [toilet, 30000]))
    expect(cost.total).toBe(2 * 450000 + 3 * 30000)
  })

  it('単価が空欄の品目は、台数があっても合計に入らない', () => {
    const list = [fx(1, kitchen), fx(2, unitBath)]
    const cost = estimateFixtureCost(list, prices([kitchen, 450000]))
    expect(cost.total).toBe(450000)
  })

  it('区画なしの什器も、単価があれば合計に入る（区画は金額に関係しない）', () => {
    const cost = estimateFixtureCost([fx(1, kitchen, null), fx(2, kitchen, 'cell-9'), fx(3, kitchen, 'cell-1')], prices([kitchen, 100]))
    expect(cost.total).toBe(300)
  })

  it('合計は、行の金額（あるものだけ）の合計と同じ', () => {
    const list = [fx(1, kitchen), fx(2, washbasin), fx(3, washbasin), fx(4, storage, null)]
    const cost = estimateFixtureCost(list, prices([kitchen, 450000], [washbasin, 0], [storage, 25000]))
    expect(cost.total).toBe(cost.rows.reduce((sum, r) => sum + (r.amount ?? 0), 0))
    expect(cost.total).toBe(450000 + 0 + 25000)
  })
})

describe('注記と、合計に入れていない品目（仕様 6）', () => {
  it('什器を 1 台も置いていなければ、単価が空欄でも、注記も合計に入れていない品目も無い', () => {
    const cost = estimateFixtureCost([], {})
    expect(cost.note).toBeNull()
    expect(cost.unpriced).toEqual([])
  })

  it('置いた什器がすべて単価ありなら、注記は無い', () => {
    const cost = estimateFixtureCost([fx(1, kitchen), fx(2, toilet)], prices([kitchen, 450000], [toilet, 30000]))
    expect(cost.note).toBeNull()
    expect(cost.unpriced).toEqual([])
  })

  it('単価が空欄の品目の什器があれば、注記を返す', () => {
    const cost = estimateFixtureCost([fx(1, kitchen), fx(2, unitBath)], prices([kitchen, 450000]))
    expect(cost.note).toBe(NOTE)
  })

  it('区画なしの什器でも、単価が空欄なら注記の対象', () => {
    const cost = estimateFixtureCost([fx(1, storage, null)], {})
    expect(cost.note).toBe(NOTE)
    expect(cost.unpriced).toEqual([storage])
  })

  it('合計に入れていない品目は、台数が 1 以上で単価が空欄の品目だけで、品目の並びで返る', () => {
    const list = [fx(1, storage), fx(2, kitchen), fx(3, toilet), fx(4, toilet)]
    const cost = estimateFixtureCost(list, prices([toilet, 30000]))
    expect(cost.unpriced).toEqual([kitchen, storage])
  })

  it('台数が 0 の品目は、単価が空欄でも、注記の対象にならない', () => {
    const cost = estimateFixtureCost([fx(1, kitchen)], prices([kitchen, 450000]))
    expect(cost.unpriced).toEqual([])
    expect(cost.note).toBeNull()
  })

  it('0 円の単価は入れた単価なので、注記の対象にならない', () => {
    const cost = estimateFixtureCost([fx(1, storage)], prices([storage, 0]))
    expect(cost.unpriced).toEqual([])
    expect(cost.note).toBeNull()
  })

  it('単価を入れると注記が消え、空欄に戻すと注記が出る', () => {
    const list = [fx(1, toilet)]
    expect(estimateFixtureCost(list, prices([toilet, 30000])).note).toBeNull()
    expect(estimateFixtureCost(list, prices([toilet, null])).note).toBe(NOTE)
  })
})

describe('入力は書き換えない・同じ入力は同じ結果（仕様 7）', () => {
  const base: Fixture[] = [fx(1, kitchen), fx(2, toilet, null), fx(3, toilet)]

  it('什器の一覧と単価を書き換えない', () => {
    const list = freeze(base)
    const unitPrices = Object.freeze(prices([kitchen, 450000]))
    const before = JSON.stringify([list, unitPrices])
    estimateFixtureCost(list, unitPrices)
    expect(JSON.stringify([list, unitPrices])).toBe(before)
  })

  it('同じ入力なら、何度呼んでも同じ結果', () => {
    const unitPrices = prices([kitchen, 450000], [toilet, 0])
    expect(estimateFixtureCost(base, unitPrices)).toEqual(estimateFixtureCost(base, unitPrices))
  })
})

describe('工事原価（概算）に渡す行（仕様 8）', () => {
  const linesOf = (list: readonly Fixture[], unitPrices: Prices) => fixtureCostLines(estimateFixtureCost(list, unitPrices))

  it('単価を入れて、1 台以上置いた品目だけが行になる（空欄・台数 0 の品目は行にならない）', () => {
    // キッチン: 単価あり・2 台 → 行。ユニットバス: 単価なし・1 台 → 行なし。洗面: 単価あり・0 台 → 行なし
    const lines = linesOf([fx(1, kitchen), fx(2, kitchen), fx(3, unitBath)], prices([kitchen, 450000], [washbasin, 80000]))
    expect(lines).toHaveLength(1)
    expect(lines[0]?.yen).toBe(900000)
  })

  it('行の区分は「内装」（仮置き）、金額は 台数 × 単価、出典なしの仮置きの印（provisional）が付く', () => {
    const lines = linesOf([fx(1, toilet), fx(2, toilet), fx(3, toilet)], prices([toilet, 30000]))
    expect(lines).toHaveLength(1)
    expect(lines[0]?.category).toBe('内装')
    expect(lines[0]?.yen).toBe(90000)
    expect(lines[0]?.provisional).toBe(true)
  })

  it('行の id は、空でなく、品目ごとに重ならない', () => {
    const list = [fx(1, kitchen), fx(2, unitBath), fx(3, washbasin), fx(4, toilet), fx(5, storage)]
    const lines = linesOf(list, prices([kitchen, 1], [unitBath, 2], [washbasin, 3], [toilet, 4], [storage, 5]))
    expect(lines).toHaveLength(5)
    const ids = lines.map((l) => l.id)
    expect(ids.every((id) => id.length > 0)).toBe(true)
    expect(new Set(ids).size).toBe(5)
  })

  it('行は品目の並び（キッチン・ユニットバス・洗面・便器・収納）で返る', () => {
    const list = [fx(1, storage), fx(2, toilet), fx(3, kitchen)]
    const lines = linesOf(list, prices([storage, 10], [toilet, 20], [kitchen, 30]))
    expect(lines.map((l) => l.yen)).toEqual([30, 20, 10])
  })

  it('0 円の単価で 1 台以上置いた品目も行になる（金額 0・出典なしの印は付く）', () => {
    const lines = linesOf([fx(1, storage)], prices([storage, 0]))
    expect(lines).toHaveLength(1)
    expect(lines[0]?.yen).toBe(0)
    expect(lines[0]?.provisional).toBe(true)
  })

  it('区画なしの什器も、行の金額に入る', () => {
    const lines = linesOf([fx(1, kitchen, null), fx(2, kitchen, 'cell-1')], prices([kitchen, 100]))
    expect(lines.map((l) => l.yen)).toEqual([200])
  })

  it('什器が無い・単価が無いときは、行も無い', () => {
    expect(linesOf([], prices([kitchen, 450000]))).toEqual([])
    expect(linesOf([fx(1, kitchen)], {})).toEqual([])
  })

  it('入力は書き換えない', () => {
    const cost = estimateFixtureCost([fx(1, kitchen)], prices([kitchen, 100]))
    const before = JSON.stringify(cost)
    fixtureCostLines(cost)
    expect(JSON.stringify(cost)).toBe(before)
  })
})

describe('工事原価（概算）の合計への入り方（仕様 8）', () => {
  it('単価表と数量が空なら、合計は什器の合計（台数 × 単価の和）と一致する', () => {
    const list = [fx(1, kitchen), fx(2, kitchen), fx(3, toilet, null)]
    const cost = estimateFixtureCost(list, prices([kitchen, 450000], [toilet, 30000]))
    const estimate = estimateCost([], [], fixtureCostLines(cost))
    expect(cost.total).toBe(2 * 450000 + 30000)
    expect(estimate.total_yen).toBe(cost.total)
  })

  it('単価が空欄の品目は、合計を増やさない', () => {
    const list = [fx(1, kitchen), fx(2, unitBath)]
    const withPrice = estimateCost([], [], fixtureCostLines(estimateFixtureCost(list, prices([kitchen, 450000]))))
    expect(withPrice.total_yen).toBe(450000)
    const blank = estimateCost([], [], fixtureCostLines(estimateFixtureCost(list, {})))
    expect(blank.total_yen).toBe(0)
  })

  it('入れた分は、内装の小計と合計に入り、出典なしの仮置き（未確定）として残る', () => {
    const estimate = estimateCost([], [], fixtureCostLines(estimateFixtureCost([fx(1, kitchen)], prices([kitchen, 450000]))))
    expect(estimate.subtotals.内装.yen).toBe(450000)
    expect(estimate.subtotals.内装.provisional).toBe(true)
    expect(estimate.provisional).toBe(true)
  })

  it('単価を入れなければ、未確定の印も付かない', () => {
    const estimate = estimateCost([], [], fixtureCostLines(estimateFixtureCost([fx(1, kitchen)], {})))
    expect(estimate.total_yen).toBe(0)
    expect(estimate.provisional).toBe(false)
  })
})
