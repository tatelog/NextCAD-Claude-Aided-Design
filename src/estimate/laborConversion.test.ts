import { describe, expect, it } from 'vitest'
import { estimateCost, type PriceRow } from './estimate'
import { laborLinesOf, priceOfLine } from './laborConversion'

// 仕様（ハブ A-03 G19・G86。統括の決定 2026-11-04）から書いたテスト。
// - 労務費 = 労務単価 × 歩掛 × 数量（G19）。型枠（床版の下面）の数量（m²）に、型枠大工の歩掛（人/m²）をかける。
// - 対応は明示の表（型枠（床版の下面）→ 型枠大工）。対応が無い品目は、労務を引かない（推測で割り付けない）。
// - 見積の合計は、労務の行を一度だけ数える（自動作成の数量との突き合わせで二重に数えない）。

const carpenter: PriceRow = {
  id: 'carpenter',
  kind: '労務',
  category: '躯体',
  item: '型枠大工',
  unit: '人',
  unit_price: 25000,
  factor: 0.3,
  source_ref: '利用者入力（出典を書く）',
  provisional: false,
  version: 'v1',
}
const concrete: PriceRow = {
  id: 'c-1',
  kind: '造作',
  category: '躯体',
  item: 'コンクリート（床版）',
  unit: 'm3',
  unit_price: 20000,
  source_ref: '利用者入力（出典を書く）',
  provisional: true,
  version: 'v1',
}

describe('型枠の労務（歩掛の換算）', () => {
  it('型枠（床版の下面）の数量は、型枠大工の労務の行になる（数量は m²、歩掛は別の掛け算）', () => {
    expect(laborLinesOf([{ item: '型枠（床版の下面）', quantity: 90 }], [carpenter, concrete])).toEqual([
      { price_id: 'carpenter', quantity: 90 },
    ])
  })

  it('型枠大工の単価の表が無ければ、労務の行は作らない', () => {
    expect(laborLinesOf([{ item: '型枠（床版の下面）', quantity: 90 }], [concrete])).toEqual([])
  })

  it('対応の無い品目（鉄筋など）は、労務の行を作らない', () => {
    expect(laborLinesOf([{ item: '鉄筋（床版）', quantity: 1.4 }], [carpenter])).toEqual([])
  })

  it('労務費の金額は、単価 × 歩掛 × 数量（G19）。型枠 90 m² は 25,000 × 0.3 × 90 = 675,000 円', () => {
    const r = priceOfLine({ item: '型枠（床版の下面）', unit: 'm2', category: '躯体', quantity: 90 }, [carpenter, concrete])
    expect(r).toEqual({ ref: 'carpenter', amount: 675000 })
  })

  it('造作単価の参照（品目・単位・分類が一致）は、単価 × 数量', () => {
    const r = priceOfLine({ item: 'コンクリート（床版）', unit: 'm3', category: '躯体', quantity: 13.5 }, [carpenter, concrete])
    expect(r).toEqual({ ref: 'c-1', amount: 270000 })
  })

  it('見積の合計は、労務の行を一度だけ数える（675,000 円）', () => {
    const e = estimateCost([carpenter], laborLinesOf([{ item: '型枠（床版の下面）', quantity: 90 }], [carpenter]))
    expect(e.total_yen).toBe(675000)
  })
})
