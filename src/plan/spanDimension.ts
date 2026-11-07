// 隣り合う位置の間の寸法（ハブ D-04 P3 の寸法線。G60）。通り芯の位置や住戸の境界を渡すと、スパンごとの寸法を返す。
// 決定論の処理だけ。入力は書き換えない。

export interface SpanDimension {
  /** 小さい側の位置（mm） */
  fromMm: number
  /** 大きい側の位置（mm） */
  toMm: number
  /** 長さ（mm）。toMm − fromMm */
  lengthMm: number
}

/** 位置を昇順にし、同じ位置を 1 つにしてから、隣り合う 2 つの間ごとに寸法を返す */
export function spanDimensions(positionsMm: readonly number[]): SpanDimension[] {
  const sorted = [...new Set(positionsMm)].sort((a, b) => a - b)
  const out: SpanDimension[] = []
  for (let i = 1; i < sorted.length; i++) {
    const fromMm = sorted[i - 1]!
    const toMm = sorted[i]!
    out.push({ fromMm, toMm, lengthMm: toMm - fromMm })
  }
  return out
}

/** 連続する等間隔の寸法をまとめる。端数の区間は独立して残す。 */
export function groupedSpanDimensions(positionsMm: readonly number[]) {
  const groups: (SpanDimension & { count: number })[] = []
  for (const span of spanDimensions(positionsMm)) {
    const last = groups[groups.length - 1]
    if (last && Math.abs(last.lengthMm - span.lengthMm) < 0.001) {
      last.toMm = span.toMm
      last.count++
    } else groups.push({ ...span, count: 1 })
  }
  return groups
}
