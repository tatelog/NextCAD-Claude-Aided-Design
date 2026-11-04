// 住戸の割り付けの単位（ハブ A-03 G99、統括の依頼 t56・統括の補足 2026-11-04）。決定論。
// 隣り合う柱列を 1 本から順にまとめ、まとめた幅が 間口 × N（N は 1 以上の整数）になる最小の範囲に、1 タイプを置く。
// N が、その範囲の住戸の数（戸）。どの範囲も合わない列は「割り付けなし（間口と合わない）」。間口が未確認（null）の型は使わない。

export interface FrontageType {
  id: string
  /** 間口（mm）。未確認（null）の型は使わない */
  frontageMm: number | null
}

/** 柱列のまとまり（start 番目から count 列）に、型を置いた単位。units は住戸の数（幅 ÷ 間口 = N） */
export interface FrontageBlock {
  start: number
  count: number
  typeId: string
  units: number
}

export interface FrontageGrouping {
  blocks: FrontageBlock[]
  /** 割り付けなしの列（列の番号。0 始まり） */
  unallocated: number[]
}

/**
 * 柱列の幅の並びを、型の間口でまとめる。1 本目から順に、まとめた幅が間口の整数倍になる最小の範囲を探し、そこに型を置く。
 * 同じ範囲に合う型が複数なら、型の並びで先の型。合う範囲が無い列は割り付けなし（その列から 1 本ずつ先へ進める）。
 */
export function groupByFrontage(spanWidthsMm: readonly number[], types: readonly FrontageType[]): FrontageGrouping {
  const blocks: FrontageBlock[] = []
  const unallocated: number[] = []
  let i = 0
  while (i < spanWidthsMm.length) {
    let total = 0
    let hit: FrontageBlock | undefined
    for (let j = i; j < spanWidthsMm.length && hit === undefined; j++) {
      total += spanWidthsMm[j]!
      for (const t of types) {
        if (t.frontageMm === null || !(t.frontageMm > 0)) continue
        if (total % t.frontageMm === 0) {
          hit = { start: i, count: j - i + 1, typeId: t.id, units: total / t.frontageMm }
          break
        }
      }
    }
    if (hit === undefined) {
      unallocated.push(i)
      i += 1
    } else {
      blocks.push(hit)
      i = hit.start + hit.count
    }
  }
  return { blocks, unallocated }
}

/** 列ごとの型の id（割り付けなしの列は null）。まとまりの型を、そのまとまりの各列に置く */
export function typeIdsOfSpans(grouping: FrontageGrouping, spans: number): (string | null)[] {
  const out: (string | null)[] = Array.from({ length: spans }, () => null)
  for (const b of grouping.blocks) for (let k = b.start; k < b.start + b.count; k++) out[k] = b.typeId
  return out
}
