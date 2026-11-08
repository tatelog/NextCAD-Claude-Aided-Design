// 見積の明細の金額（ハブ A-03 G86）。数量の明細（DetailLine）に、単価の参照と金額（円）を付けて、DB に入れる形にする。決定論。
// 単価の参照と金額は、laborConversion.ts の priceOfLine で決める（造作は単価 × 数量、労務は単価 × 歩掛 × 数量）。参照が無い行は null（未参照）。
import type { PriceRow } from './estimate'
import type { DetailLine } from './estimateDetail'
import { priceOfLine } from './laborConversion'

/** 出どころ（G86）。自動はオブジェクトから拾った数量、手入力は利用者が単価ごとに入れた数量（オブジェクトは無い） */
export type EstimateOrigin = '自動' | '手入力'

/** 見積の明細（DB の 1 行）。金額は円の整数。参照が無い行は null */
export interface EstimateDetail extends Omit<DetailLine, 'objectId'> {
  specification?: import('./specPackages').PackageLine
  /** 元になったオブジェクトの id。手入力の行は無い（null） */
  objectId: string | null
  amountYen: number | null
  origin: EstimateOrigin
}

/** 数量の明細に、単価の参照と金額を付ける。行の数と順は入力と同じ。出どころは自動 */
export function estimateDetailsOf(lines: readonly DetailLine[], prices: readonly PriceRow[]): EstimateDetail[] {
  return lines.map((line): EstimateDetail => {
    const price = priceOfLine(line, prices)
    return { ...line, unitPriceRef: price?.ref ?? null, amountYen: price?.amount ?? null, origin: '自動' }
  })
}
