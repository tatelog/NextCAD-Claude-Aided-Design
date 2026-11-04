// 見積の明細の金額（ハブ A-03 G86）。数量の明細（DetailLine）に、単価の参照と金額（円）を付けて、DB に入れる形にする。決定論。
// 単価の参照と金額は、laborConversion.ts の priceOfLine で決める（造作は単価 × 数量、労務は単価 × 歩掛 × 数量）。参照が無い行は null（未参照）。
import type { PriceRow } from './estimate'
import type { DetailLine } from './estimateDetail'
import { priceOfLine } from './laborConversion'

/** 見積の明細（DB の 1 行）。金額は円の整数。参照が無い行は null */
export interface EstimateDetail extends DetailLine {
  amountYen: number | null
}

/** 数量の明細に、単価の参照と金額を付ける。行の数と順は入力と同じ */
export function estimateDetailsOf(lines: readonly DetailLine[], prices: readonly PriceRow[]): EstimateDetail[] {
  return lines.map((line) => {
    const price = priceOfLine(line, prices)
    return { ...line, unitPriceRef: price?.ref ?? null, amountYen: price?.amount ?? null }
  })
}
