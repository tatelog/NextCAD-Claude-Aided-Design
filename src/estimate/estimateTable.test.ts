// 仕様（ハブ A-03 G86「見積は明細の DB」。見積の金額と手入力の数量は、見積の明細の表が正本。統括の決定 2026-11-04）:
// A. 手入力の数量を入れると、表に「手入力」の行ができる（単価の参照・金額（単価 × 数量、円）・オブジェクトは無い）。
// B. 入力が空・0 以下・数でないときは、その単価の手入力の行を外す。
// C. 同じ単価の手入力は入れ替える（行の位置は保つ）。
// D. 単価の表が変わったら、手入力の行の金額を取り直す。単価が無くなったら、参照と金額は null（数量は残す）。
// E. 工事原価は表の行から出る。同じ単価に手入力があれば手入力だけを数える（自動と二重に数えない）。自動の行は同じ単価の分を足す。
// F. 自動の行を入れ替えても、手入力の行は残る。
import { describe, expect, it } from 'vitest'
import { estimateCost, type PriceRow } from './estimate'
import type { EstimateDetail } from './estimateDetails'
import {
  autoQuantityOfPrice,
  manualQuantityOfPrice,
  quantityLinesOfTable,
  refreshManualLines,
  withManualQuantity,
  withOriginLines,
} from './estimateTable'

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
const cross: PriceRow = {
  id: 'cross',
  kind: '造作',
  category: '内装',
  item: '壁クロス',
  unit: 'm2',
  unit_price: 1200,
  source_ref: '利用者入力（出典を書く）',
  provisional: false,
  version: 'v1',
}
const PRICES = [carpenter, cross]

// 自動の行（オブジェクトから拾った数量）
const formwork: EstimateDetail = {
  lineId: 'slab-1/formwork',
  objectId: 'slab-1',
  category: '躯体',
  item: '型枠（床版の下面）',
  quantity: 90,
  unit: 'm2',
  unitPriceRef: 'carpenter',
  amountYen: 675000,
  provisional: true,
  source: '出典なし・仮置き（G22）',
  basis: '床版と同じ面積（支保工は含めない）',
  origin: '自動',
}
const wall: EstimateDetail = {
  lineId: 'room-1/cross',
  objectId: 'room-1',
  category: '内装',
  item: '壁クロス',
  quantity: 4608,
  unit: 'm2',
  unitPriceRef: 'cross',
  amountYen: 5529600,
  provisional: false,
  source: '計算（仮置きなし）',
  basis: '部屋の壁の面積',
  origin: '自動',
}

describe('A. 手入力の行', () => {
  it('数量を入れると、単価の参照・金額（単価 × 数量）・出どころ「手入力」の行ができ、オブジェクトは無い', () => {
    const [row] = withManualQuantity([], cross, '18')
    expect(row).toMatchObject({
      lineId: 'manual/cross',
      objectId: null,
      category: '内装',
      item: '壁クロス',
      quantity: 18,
      unit: 'm2',
      unitPriceRef: 'cross',
      amountYen: 21600,
      provisional: false,
      origin: '手入力',
    })
  })
})

describe('B. 入力が数でない・0 以下・空のとき', () => {
  it.each(['', '0', '-3', 'abc'])('入力が「%s」なら、その単価の手入力の行を外す', (text) => {
    const lines = withManualQuantity([formwork], cross, '18')
    expect(withManualQuantity(lines, cross, text).map((l) => l.lineId)).toEqual(['slab-1/formwork'])
  })
})

describe('C. 同じ単価の手入力は入れ替える', () => {
  it('入れ替えても、行の数は増えず、行の位置は保つ', () => {
    const lines = withManualQuantity([formwork], cross, '18')
    const next = withManualQuantity(lines, cross, '20')
    expect(next.map((l) => l.lineId)).toEqual(['slab-1/formwork', 'manual/cross'])
    expect(next[1]).toMatchObject({ quantity: 20, amountYen: 24000 })
  })
})

describe('D. 単価の表が変わったとき', () => {
  it('単価が変われば、手入力の行の金額を取り直す', () => {
    const lines = withManualQuantity([], cross, '18')
    const [row] = refreshManualLines(lines, [carpenter, { ...cross, unit_price: 1500 }])
    expect(row).toMatchObject({ unitPriceRef: 'cross', amountYen: 27000 })
  })

  it('単価が無くなったら、参照と金額は null（数量は残す）', () => {
    const lines = withManualQuantity([], cross, '18')
    const [row] = refreshManualLines(lines, [carpenter])
    expect(row).toMatchObject({ quantity: 18, unitPriceRef: null, amountYen: null })
  })
})

describe('E. 工事原価は表の行から出る', () => {
  it('自動の行は、単価の参照ごとに数量を数える（単価表の順）', () => {
    expect(quantityLinesOfTable([wall, formwork], PRICES)).toEqual([
      { price_id: 'carpenter', quantity: 90 },
      { price_id: 'cross', quantity: 4608 },
    ])
  })

  it('同じ単価の手入力があれば、手入力だけを数える（自動と二重に数えない）', () => {
    const lines = withManualQuantity([formwork, wall], carpenter, '100')
    expect(quantityLinesOfTable(lines, PRICES)).toEqual([
      { price_id: 'carpenter', quantity: 100 },
      { price_id: 'cross', quantity: 4608 },
    ])
  })

  it('同じ単価の自動の行は、数量を足す', () => {
    const second: EstimateDetail = { ...wall, lineId: 'room-2/cross', objectId: 'room-2', quantity: 100, amountYen: 120000 }
    expect(quantityLinesOfTable([wall, second], PRICES)).toEqual([{ price_id: 'cross', quantity: 4708 }])
  })

  it('単価の表に無い参照の行は、数えない', () => {
    const orphan: EstimateDetail = { ...wall, lineId: 'room-9/gone', unitPriceRef: 'gone' }
    expect(quantityLinesOfTable([orphan], PRICES)).toEqual([])
  })

  it('工事原価は、表の行を単価表に当てて出す（手入力 18 m² が自動 4608 m² に勝つ）', () => {
    const lines = withManualQuantity([formwork, wall], cross, '18')
    const e = estimateCost(PRICES, quantityLinesOfTable(lines, PRICES), [])
    expect(e.total_yen).toBe(675000 + 21600)
  })

  it('数量の値は、表から読むだけで、同じ表なら同じ金額', () => {
    const lines = withManualQuantity([formwork], cross, '18')
    expect(quantityLinesOfTable(lines, PRICES)).toEqual(quantityLinesOfTable(lines, PRICES))
  })
})

describe('F. 自動の行の入れ替え', () => {
  it('自動の行を入れ替えても、手入力の行は残る（手入力が先、入れ替えた自動が後）', () => {
    const lines = withManualQuantity([formwork], cross, '18')
    const out = withOriginLines(lines, '自動', [{ ...formwork, amountYen: 700000 }])
    expect(out.map((l) => l.lineId)).toEqual(['manual/cross', 'slab-1/formwork'])
    expect(out[1]!.amountYen).toBe(700000)
  })
})

describe('値を引く関数', () => {
  it('単価ごとの自動の数量・手入力の数量を、表から引く（無ければ null）', () => {
    const lines = withManualQuantity([formwork], cross, '18')
    expect(autoQuantityOfPrice(lines, 'carpenter')).toBe(90)
    expect(autoQuantityOfPrice(lines, 'cross')).toBeNull()
    expect(manualQuantityOfPrice(lines, 'cross')).toBe(18)
    expect(manualQuantityOfPrice(lines, 'carpenter')).toBeNull()
  })
})
