// 数量の自動拾い（P4）。手で入れた数量を優先し、無ければ品目名が完全一致する自動の数量を使う（推測で結ばない）。
export interface AutoQuantity {
  item: string
  quantity: number
}

export function effectiveQuantity(
  row: { item: string },
  manual: string,
  auto: readonly AutoQuantity[],
): { quantity: number; source: '手入力' | '自動' } | null {
  const typed = Number(manual)
  if (manual.trim() !== '' && Number.isFinite(typed) && typed > 0) return { quantity: typed, source: '手入力' }
  const hit = auto.find((a) => a.item === row.item)
  return hit ? { quantity: hit.quantity, source: '自動' } : null
}
