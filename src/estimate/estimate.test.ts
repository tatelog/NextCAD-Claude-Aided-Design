// 仕様: P4 積算（D-02 C8、D-03 T-04 見積・T-10 単価、D-04 P4、A-03 G19・G21・G22・G62・G63）。
// 仕様 1（G19）: 工事原価 = 材料費（造作単価 × 数量）＋ 労務費（労務単価 × 歩掛 × 数量）＋ その他の工事原価。
//   直接仮設・共通仮設費・現場管理費・一般管理費は入れない（T-10 の kind に存在しないので弾く）。
// 仕様 2（G21）: 金額は円の整数。各行を四捨五入して円にし、合計はその行の和。
// 仕様 3（G63）: 区分（躯体・外装・内装・外構）ごとの小計を持ち、合計は小計の和に一致する。
// 仕様 4（G22）: 出典のない単価（source_ref が空、または provisional）を使った行は provisional。
//   合計にも provisional を残す（未確定の印は内訳と合計に残る）。
// 仕様 5（T-04）: 結果は basis_version（単価表の版）を持つ。
// 仕様 6: 単価 ID が単価表に無い、数量が 0 以下、単価が整数でない、区分が列挙外なら弾く。
// 仕様 7（金額の決まった行。ハブ A-03 G69・G22 の今回の決定）: 単価表と数量の行に載らない行（什器の 台数 × 単価 など）を、
//   id・区分・円・出典なしの印（provisional）で、3 つ目の引数に渡せる。内訳の行（price_id に id が入る）、区分の小計、合計に入る。
//   出典なしの印は行・小計・合計に残る（仕様 4 と同じ）。渡さなければ今までと同じ。単価表・数量が空でも、この行だけで出せる。
//   円の整数でない・負・区分が列挙外・id が空なら弾く（仕様 6 と同じ）。
import { describe, expect, it } from 'vitest'
import { estimateCost, type PriceRow } from './estimate'

const prices: PriceRow[] = [
  {
    id: 'cross-finish',
    kind: '造作',
    category: '内装',
    item: 'クロス',
    unit: 'm2',
    unit_price: 1_200,
    source_ref: '出典A',
    provisional: false,
    version: 'v1',
  },
  {
    id: 'carpenter',
    kind: '労務',
    category: '躯体',
    item: '型枠大工',
    unit: '人',
    unit_price: 25_000,
    factor: 0.3,
    source_ref: '出典B',
    provisional: false,
    version: 'v1',
  },
  {
    id: 'exterior-tile',
    kind: '造作',
    category: '外装',
    item: '外壁タイル',
    unit: 'm2',
    unit_price: 8_000,
    source_ref: '',
    provisional: false,
    version: 'v1',
  },
]

describe('estimateCost', () => {
  it('材料費（単価 × 数量）と労務費（労務単価 × 歩掛 × 数量）を円の整数で足し上げる', () => {
    const r = estimateCost(prices, [
      { price_id: 'cross-finish', quantity: 100 },
      { price_id: 'carpenter', quantity: 10 },
    ])
    expect(r.lines.find((l) => l.price_id === 'cross-finish')!.yen).toBe(120_000)
    // 25,000 × 0.3 × 10 = 75,000
    expect(r.lines.find((l) => l.price_id === 'carpenter')!.yen).toBe(75_000)
    expect(r.total_yen).toBe(195_000)
  })

  it('各行の金額は四捨五入して円の整数にする', () => {
    const r = estimateCost(prices, [{ price_id: 'carpenter', quantity: 1 }])
    // 25,000 × 0.3 × 1 = 7,500（整数のまま）。端数を作る数量で確かめる
    const r2 = estimateCost(prices, [{ price_id: 'carpenter', quantity: 3 }])
    expect(Number.isInteger(r2.lines[0]!.yen)).toBe(true)
    expect(r.lines[0]!.yen).toBe(7_500)
  })

  it('区分（躯体・外装・内装・外構）ごとの小計を持ち、合計は小計の和に一致する', () => {
    const r = estimateCost(prices, [
      { price_id: 'cross-finish', quantity: 100 },
      { price_id: 'carpenter', quantity: 10 },
      { price_id: 'exterior-tile', quantity: 50 },
    ])
    expect(r.subtotals.内装.yen).toBe(120_000)
    expect(r.subtotals.躯体.yen).toBe(75_000)
    expect(r.subtotals.外装.yen).toBe(400_000)
    expect(r.subtotals.外構.yen).toBe(0)
    const sum = r.subtotals.躯体.yen + r.subtotals.外装.yen + r.subtotals.内装.yen + r.subtotals.外構.yen
    expect(r.total_yen).toBe(sum)
  })

  it('出典のない単価を使った行は provisional になり、合計にも残る', () => {
    const r = estimateCost(prices, [
      { price_id: 'cross-finish', quantity: 100 },
      { price_id: 'exterior-tile', quantity: 50 },
    ])
    expect(r.lines.find((l) => l.price_id === 'exterior-tile')!.provisional).toBe(true)
    expect(r.lines.find((l) => l.price_id === 'cross-finish')!.provisional).toBe(false)
    expect(r.provisional).toBe(true)
    expect(r.subtotals.外装.provisional).toBe(true)
    expect(r.subtotals.内装.provisional).toBe(false)
  })

  it('結果は単価表の版（basis_version）を持つ', () => {
    const r = estimateCost(prices, [{ price_id: 'cross-finish', quantity: 1 }])
    expect(r.basis_version).toBe('v1')
  })

  it('単価 ID が単価表に無ければ弾く', () => {
    expect(() => estimateCost(prices, [{ price_id: 'nope', quantity: 1 }])).toThrow()
  })

  it('数量が 0 以下なら弾く', () => {
    expect(() => estimateCost(prices, [{ price_id: 'cross-finish', quantity: 0 }])).toThrow()
    expect(() => estimateCost(prices, [{ price_id: 'cross-finish', quantity: -1 }])).toThrow()
  })

  it('単価が整数の円でなければ弾く（G21 の円単位）', () => {
    const bad = [{ ...prices[0]!, unit_price: 1_200.5 }]
    expect(() => estimateCost(bad, [{ price_id: 'cross-finish', quantity: 1 }])).toThrow()
  })

  it('直接仮設・共通仮設費・現場管理費・一般管理費は単価の kind に存在せず、弾く（G19）', () => {
    for (const kind of ['直接仮設', '共通仮設費', '現場管理費', '一般管理費']) {
      const bad = [{ ...prices[0]!, kind }]
      expect(() => estimateCost(bad as unknown as PriceRow[], [{ price_id: 'cross-finish', quantity: 1 }])).toThrow()
    }
  })
})

describe('estimateCost（金額の決まった行。仕様 7）', () => {
  const base = [
    { price_id: 'cross-finish', quantity: 100 },
    { price_id: 'exterior-tile', quantity: 50 },
  ]
  // 什器の行の例（キッチン 2 台 × 450,000 円。出典なしの仮置き）
  const kitchenLine = { id: 'fixture:kitchen', category: '内装', yen: 900_000, provisional: true }

  it('渡した行は、内訳の行（price_id に id）として、区分・円・出典なしの印のまま入る', () => {
    const r = estimateCost(prices, base, [kitchenLine])
    expect(r.lines.find((l) => l.price_id === 'fixture:kitchen')).toEqual({
      price_id: 'fixture:kitchen',
      category: '内装',
      yen: 900_000,
      provisional: true,
    })
  })

  it('単価表と数量の行は、渡した行があっても変わらない', () => {
    const r = estimateCost(prices, base, [kitchenLine])
    expect(r.lines.find((l) => l.price_id === 'cross-finish')!.yen).toBe(120_000)
    expect(r.lines.find((l) => l.price_id === 'exterior-tile')!.yen).toBe(400_000)
    expect(r.lines).toHaveLength(3)
  })

  it('区分の小計と合計に入り、合計は小計の和に一致する', () => {
    const r = estimateCost(prices, base, [kitchenLine])
    expect(r.subtotals.内装.yen).toBe(120_000 + 900_000)
    expect(r.subtotals.外装.yen).toBe(400_000)
    expect(r.total_yen).toBe(120_000 + 400_000 + 900_000)
    const sum = r.subtotals.躯体.yen + r.subtotals.外装.yen + r.subtotals.内装.yen + r.subtotals.外構.yen
    expect(r.total_yen).toBe(sum)
  })

  it('出典なしの印（provisional）は、行・その区分の小計・合計に残り、ほかの区分には移らない', () => {
    const r = estimateCost(prices, [{ price_id: 'cross-finish', quantity: 100 }], [kitchenLine])
    expect(r.lines.find((l) => l.price_id === 'cross-finish')!.provisional).toBe(false)
    expect(r.lines.find((l) => l.price_id === 'fixture:kitchen')!.provisional).toBe(true)
    expect(r.subtotals.内装.provisional).toBe(true)
    expect(r.subtotals.躯体.provisional).toBe(false)
    expect(r.subtotals.外装.provisional).toBe(false)
    expect(r.provisional).toBe(true)
  })

  it('出典ありの行（provisional が false）は、未確定の印を足さない', () => {
    const r = estimateCost(prices, [{ price_id: 'cross-finish', quantity: 100 }], [{ ...kitchenLine, provisional: false }])
    expect(r.subtotals.内装.yen).toBe(120_000 + 900_000)
    expect(r.subtotals.内装.provisional).toBe(false)
    expect(r.provisional).toBe(false)
  })

  it('渡さなければ（省略しても、空でも）今までと同じ結果', () => {
    expect(estimateCost(prices, base, [])).toEqual(estimateCost(prices, base))
  })

  it('単価表も数量も空でも、金額の決まった行だけで合計が出る', () => {
    const r = estimateCost([], [], [kitchenLine, { id: 'fixture:toilet', category: '内装', yen: 90_000, provisional: true }])
    expect(r.total_yen).toBe(990_000)
    expect(r.subtotals.内装.yen).toBe(990_000)
    expect(r.lines).toHaveLength(2)
    expect(r.provisional).toBe(true)
  })

  it('単価表の版（basis_version）は、金額の決まった行に影響されない', () => {
    const r = estimateCost(prices, [{ price_id: 'cross-finish', quantity: 1 }], [kitchenLine])
    expect(r.basis_version).toBe('v1')
    expect(r.total_yen).toBe(1_200 + 900_000)
  })

  it('円の整数でない・負・区分が列挙外・id が空・印が無い行は弾く', () => {
    const bads = [
      { ...kitchenLine, yen: 100.5 },
      { ...kitchenLine, yen: -1 },
      { ...kitchenLine, category: '直接仮設' },
      { ...kitchenLine, id: '' },
      { id: 'fixture:kitchen', category: '内装', yen: 100 },
    ]
    for (const bad of bads) expect(() => estimateCost(prices, base, [bad])).toThrow()
  })
})
