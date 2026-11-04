import { describe, expect, it } from 'vitest'
import { estimateDetailsOf } from './estimateDetails'
import type { DetailLine } from './estimateDetail'
import type { PriceRow } from './estimate'

// 仕様（ハブ A-03 G86。統括の決定「見積は明細の DB」）から書いたテスト。
// - 見積の明細は、数量の明細（DetailLine）に、単価の参照と金額（円）を付けたもの（DB に入れる形）。
// - 金額は priceOfLine の結果（造作は単価 × 数量、労務は単価 × 歩掛 × 数量）。参照が無い行は null。

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

const formwork: DetailLine = {
  lineId: 'slab-1/formwork',
  objectId: 'slab-1',
  category: '躯体',
  item: '型枠（床版の下面）',
  quantity: 90,
  unit: 'm2',
  unitPriceRef: null,
  provisional: true,
  basis: '床版と同じ面積（支保工は含めない）',
  source: '出典なし・仮置き（G22）',
}
const roof: DetailLine = {
  lineId: 'roof-1/roof',
  objectId: 'roof-1',
  category: '外装',
  item: '屋根防水',
  quantity: 18,
  unit: 'm2',
  unitPriceRef: null,
  provisional: false,
  basis: '外形から',
  source: '計算（仮置きなし）',
}

describe('見積の明細（DB に入れる形）', () => {
  it('型枠は、型枠大工の参照と労務費（675,000 円）を持つ', () => {
    const [d] = estimateDetailsOf([formwork], [carpenter])
    expect(d).toMatchObject({ unitPriceRef: 'carpenter', amountYen: 675000, quantity: 90, provisional: true })
  })

  it('参照が無い行は、参照と金額を null（未参照）にする', () => {
    const [d] = estimateDetailsOf([roof], [carpenter])
    expect(d).toMatchObject({ unitPriceRef: null, amountYen: null, provisional: false, source: '計算（仮置きなし）' })
  })

  it('行の数と順は、数量の明細と同じ', () => {
    const out = estimateDetailsOf([formwork, roof], [carpenter])
    expect(out.map((d) => d.lineId)).toEqual(['slab-1/formwork', 'roof-1/roof'])
  })

  it('オブジェクトから拾った行の出どころは「自動」で、オブジェクトの id を持つ', () => {
    const [d] = estimateDetailsOf([formwork], [carpenter])
    expect(d).toMatchObject({ origin: '自動', objectId: 'slab-1' })
  })
})
