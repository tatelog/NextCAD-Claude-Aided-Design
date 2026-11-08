// 歩掛の換算（ハブ A-03 G19・G86）。明細の数量（型枠は m²）から、労務の行（型枠大工・歩掛は人/m²）を出す。決定論。
// 労務費 = 労務単価 × 歩掛 × 数量（G19。estimate.ts の estimateCost と同じ）。
// 品目と労務の対応は、ここに明示する（仮定。統括が確認する）。対応の無い品目は労務を引かない。
import type { PriceRow } from './estimate'

/** 明細の品目 → 労務の品目（型枠大工）。歩掛は労務の行の factor（人/単位） */
export const LABOR_OF_ITEM: Record<string, string> = {
  '型枠（床版の下面）': '型枠大工',
}

/** 明細の数量（品目と数量）から、労務の行（単価の id と数量）を作る。単価の表に対応する労務が無ければ作らない */
export function laborLinesOf(
  items: readonly { item: string; quantity: number }[],
  prices: readonly PriceRow[],
): { price_id: string; quantity: number }[] {
  const out: { price_id: string; quantity: number }[] = []
  for (const it of items) {
    const laborItem = LABOR_OF_ITEM[it.item]
    if (laborItem === undefined) continue
    const row = prices.find((p) => p.kind === '労務' && p.item === laborItem)
    if (row) out.push({ price_id: row.id, quantity: it.quantity })
  }
  return out
}

/** 明細の一行の単価の参照と金額（円）。造作は 単価 × 数量。労務（対応あり）は 単価 × 歩掛 × 数量。無ければ null（未参照） */
export function priceOfLine(
  line: { item: string; unit: string; category: string; quantity: number },
  prices: readonly PriceRow[],
): { ref: string; amount: number } | null {
  const exact = prices.find((p) => p.kind === '造作' && p.item === line.item && p.unit === line.unit && p.category === line.category)
  if (exact) return { ref: exact.id, amount: Math.round(exact.unit_price * line.quantity) }
  const laborItem = LABOR_OF_ITEM[line.item]
  const labor = laborItem === undefined ? undefined : prices.find((p) => p.kind === '労務' && p.item === laborItem)
  if (labor && labor.factor !== undefined) return { ref: labor.id, amount: Math.round(labor.unit_price * labor.factor * line.quantity) }
  return null
}

/**
 * 対応のある労務の品目で、単価の行（歩掛つき）も造作の参照も無い明細。単価は利用者が置くので（G20・G136）、
 * 置かれていなければ「単価未設定」と出し、金額には入れない（t49 の残り）。対応の無い品目は、未設定とは言わない。
 */
export function isLaborUnset(line: { item: string; unit: string; category: string; quantity: number }, prices: readonly PriceRow[]): boolean {
  if (!isLaborItem(line.item)) return false
  return priceOfLine(line, prices) === null
}

/** 品目が、労務の対応を持つか（LABOR_OF_ITEM にあるか） */
export function isLaborItem(item: string): boolean {
  return LABOR_OF_ITEM[item] !== undefined
}
