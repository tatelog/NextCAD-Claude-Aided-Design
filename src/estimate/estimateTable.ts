// 見積の明細の表の操作（ハブ A-03 G86「見積は明細の DB」）。手入力の数量・自動の行の入れ替え・工事原価の数量を、表の行から出す。決定論。
// 手入力の行は lineId を「manual/<単価の id>」にし、単価ごとに 1 行。同じ単価の手入力は入れ替える。
// 工事原価は、同じ単価に手入力があれば手入力だけを数え、無ければ自動の行の数量を足す（二重に数えない）。
import { estimateCost, type PriceRow, type QuantityLine } from './estimate'
import type { EstimateDetail, EstimateOrigin } from './estimateDetails'

const MANUAL_PREFIX = 'manual/'

const manualIdOf = (priceId: string): string => `${MANUAL_PREFIX}${priceId}`

// 手入力の数量の単位は、単価の行の単位（m²・m³・t のいずれか。それ以外は m²）
function unitOfManual(unit: string): EstimateDetail['unit'] {
  return unit === 'm3' || unit === 't' ? unit : 'm2'
}

// 入力の文字を数量にする。空・数でない・0 以下は無し（null）
function quantityOfText(text: string): number | null {
  const n = Number(text)
  return text.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null
}

/** 手入力の行を作る（数量は 0 より大きい）。金額と仮置きの印は、工事原価と同じ決め方（estimateCost） */
export function manualLineOf(row: PriceRow, quantity: number): EstimateDetail {
  const provisional = row.provisional || row.source_ref.trim() === ''
  const amountYen = estimateCost([row], [{ price_id: row.id, quantity }]).lines[0]!.yen
  return {
    lineId: manualIdOf(row.id),
    objectId: null,
    category: row.category,
    item: row.item,
    quantity,
    unit: unitOfManual(row.unit),
    unitPriceRef: row.id,
    amountYen,
    provisional,
    source: provisional ? '出典なし・仮置き' : row.source_ref,
    basis: '手入力（利用者が数量を入れた）',
    origin: '手入力',
  }
}

/** 単価の手入力を、入力の文字で入れ替える。空・数でない・0 以下なら、その行を外す。入れ替えは行の位置を保つ */
export function withManualQuantity(lines: readonly EstimateDetail[], row: PriceRow, text: string): EstimateDetail[] {
  const id = manualIdOf(row.id)
  const quantity = quantityOfText(text)
  if (quantity === null) return lines.filter((l) => l.lineId !== id)
  const next = manualLineOf(row, quantity)
  return lines.some((l) => l.lineId === id) ? lines.map((l) => (l.lineId === id ? next : l)) : [...lines, next]
}

/** 手入力の行の金額を、いまの単価の表で取り直す。単価が無ければ参照と金額は null（数量は残す） */
export function refreshManualLines(lines: readonly EstimateDetail[], prices: readonly PriceRow[]): EstimateDetail[] {
  return lines.map((l) => {
    if (l.origin !== '手入力') return l
    const row = prices.find((p) => manualIdOf(p.id) === l.lineId)
    return row ? manualLineOf(row, l.quantity) : { ...l, unitPriceRef: null, amountYen: null }
  })
}

/** 出どころが origin の行を next で置き換える。ほかの出どころの行はそのまま残し、残した行を先に並べる */
export function withOriginLines(lines: readonly EstimateDetail[], origin: EstimateOrigin, next: readonly EstimateDetail[]): EstimateDetail[] {
  return [...lines.filter((l) => l.origin !== origin), ...next]
}

/** 工事原価の数量（単価の id ごと）。単価の表の順。同じ単価に手入力があれば手入力だけ、無ければ自動の行の数量を足す。単価の表に無い参照と数量 0 は数えない */
export function quantityLinesOfTable(lines: readonly EstimateDetail[], prices: readonly PriceRow[]): QuantityLine[] {
  const out: QuantityLine[] = []
  for (const p of prices) {
    const manual = manualQuantityOfPrice(lines, p.id)
    const quantity = manual ?? autoQuantityOfPrice(lines, p.id) ?? 0
    if (quantity > 0) out.push({ price_id: p.id, quantity })
  }
  return out
}

/** 単価の id の自動の数量（同じ単価の自動の行の数量の合計）。無ければ null */
export function autoQuantityOfPrice(lines: readonly EstimateDetail[], priceId: string): number | null {
  const hits = lines.filter((l) => l.origin === '自動' && l.unitPriceRef === priceId)
  return hits.length === 0 ? null : hits.reduce((sum, l) => sum + l.quantity, 0)
}

/** 単価の id の手入力の数量。無ければ null */
export function manualQuantityOfPrice(lines: readonly EstimateDetail[], priceId: string): number | null {
  const hit = lines.find((l) => l.origin === '手入力' && l.unitPriceRef === priceId)
  return hit ? hit.quantity : null
}
