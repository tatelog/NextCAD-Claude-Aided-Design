// 仕様（統括の依頼 2026-11-05、t49 の残り。G19・G20・G22・G118・G136）: 労務の単価は利用者が置く。置かれていなければ「単価未設定」と出す。
// 仕様 1（単価未設定）: 対応のある労務の品目（型枠（床版の下面））で、歩掛つきの労務の行が無いとき、その明細は「単価未設定」。
// 仕様 2（単価あり）: 歩掛つきの労務の行があるとき、その明細は「単価未設定」ではない（金額は単価 × 歩掛 × 数量）。
// 仕様 3（対応なし）: 対応の無い品目（鉄筋（床版））は、労務の行が無くても「単価未設定」にしない（従来どおり未参照）。
// 仕様 4（造作）: 造作の単価で参照できる品目は、「単価未設定」にしない。
// 仕様 5（合計）: 単価未設定の労務は、見積の合計に入らない（推測で数えない）。
import { describe, expect, it } from 'vitest'
import { estimateCost, type PriceRow } from './estimate'
import { isLaborUnset, laborLinesOf } from './laborConversion'

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

const formwork = { item: '型枠（床版の下面）', unit: 'm2', category: '躯体', quantity: 90 }
const rebar = { item: '鉄筋（床版）', unit: 't', category: '躯体', quantity: 1.4 }
const concreteLine = { item: 'コンクリート（床版）', unit: 'm3', category: '躯体', quantity: 13.5 }

describe('単価未設定（仕様 1〜4）', () => {
  it('仕様 1: 型枠大工の行（歩掛つき）が無い型枠は、単価未設定', () => {
    expect(isLaborUnset(formwork, [concrete])).toBe(true)
  })

  it('仕様 2: 型枠大工の行（歩掛つき）があれば、単価未設定ではない', () => {
    expect(isLaborUnset(formwork, [carpenter, concrete])).toBe(false)
  })

  it('仕様 3: 対応の無い品目（鉄筋）は、労務の行が無くても単価未設定にしない', () => {
    expect(isLaborUnset(rebar, [carpenter])).toBe(false)
  })

  it('仕様 4: 造作の単価で参照できる品目は、単価未設定にしない', () => {
    expect(isLaborUnset(concreteLine, [concrete])).toBe(false)
  })
})

describe('単価未設定の労務は合計に入らない（仕様 5）', () => {
  it('型枠の労務の行が無いときは、労務の行を作らず、合計に労務費が入らない', () => {
    const lines = laborLinesOf([formwork], [concrete])
    expect(lines).toEqual([])
    expect(estimateCost([concrete], lines).total_yen).toBe(0)
  })
})
