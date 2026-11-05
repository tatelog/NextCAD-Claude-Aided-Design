// 案件の要約（ハブ A-03 G144、統括の依頼 t55）。作業ログの行から、設定の文字数以内の要約を作る。
// 新しい行を残し、古い行から落とす。行の並びは時刻の古い順で、そのまま読める。決定論。
export interface MemoryRow {
  at: string
  screen: string
  action: string
  target: string
}

export function memorySummaryOf(rows: readonly MemoryRow[], maxChars: number): string {
  const lines = rows.map((r) => `${r.at} ${r.screen} ${r.action} ${r.target}`)
  const kept: string[] = []
  let total = 0
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!
    const add = line.length + (kept.length > 0 ? 1 : 0)
    if (total + add > maxChars) break
    kept.unshift(line)
    total += add
  }
  return kept.join('\n')
}
