// 住戸の割り付けの単位（ハブ A-03 G99、統括の依頼 t56）。連続する柱列をまとめた単位の幅が、住戸タイプの間口（mm）の整数倍なら、その型の候補になる。決定論。
// 間口が未確認（null）の型は候補にしない。候補にならない組み合わせは、そもそも割り付けない。

export interface FrontageType {
  id: string
  /** 間口（mm）。未確認（null）の型は候補にしない */
  frontageMm: number | null
}

/** 柱列のまとまり（start 番目から count 列）に、型を当てた単位。units は住戸の数（幅 ÷ 間口） */
export interface FrontageBlock {
  start: number
  count: number
  typeId: string
  units: number
}

/** 連続する柱列のまとまりのうち、幅の合計が型の間口の整数倍になるものを、候補として並べる（柱列の順、列の数の順、型の順） */
export function candidateBlocks(spanWidthsMm: readonly number[], types: readonly FrontageType[]): FrontageBlock[] {
  const out: FrontageBlock[] = []
  for (let start = 0; start < spanWidthsMm.length; start++) {
    let total = 0
    for (let count = 1; start + count <= spanWidthsMm.length; count++) {
      total += spanWidthsMm[start + count - 1]!
      for (const t of types) {
        if (t.frontageMm === null || !(t.frontageMm > 0)) continue
        if (total % t.frontageMm === 0) out.push({ start, count, typeId: t.id, units: total / t.frontageMm })
      }
    }
  }
  return out
}

/**
 * 柱列の全部を、候補の単位だけで覆う割り付けを返す。住戸の数の合計が最も少ないものを選ぶ。
 * 住戸の数が同じなら、柱列のまとまりの数が少ないほう（まとめた単位を優先する。G99「柱列をまとめた単位」）。
 * 覆えないときは null（別の型で黙って埋めない）。柱列が無いときは空の割り付け。
 */
export function partitionByFrontage(spanWidthsMm: readonly number[], types: readonly FrontageType[]): FrontageBlock[] | null {
  const n = spanWidthsMm.length
  if (n === 0) return []
  const candidates = candidateBlocks(spanWidthsMm, types)
  // 先頭 i 列を覆うときの（住戸の数の合計、まとまりの数）の最小。from[i]: その最後の単位
  const units: number[] = Array.from({ length: n + 1 }, () => Infinity)
  const blocks: number[] = Array.from({ length: n + 1 }, () => Infinity)
  const from: (FrontageBlock | null)[] = Array.from({ length: n + 1 }, () => null)
  units[0] = 0
  blocks[0] = 0
  for (const c of candidates) {
    const end = c.start + c.count
    const u = units[c.start]! + c.units
    const b = blocks[c.start]! + 1
    if (u < units[end]! || (u === units[end] && b < blocks[end]!)) {
      units[end] = u
      blocks[end] = b
      from[end] = c
    }
  }
  if (units[n] === Infinity) return null
  const out: FrontageBlock[] = []
  for (let i = n; i > 0; ) {
    const c = from[i]!
    out.unshift(c)
    i = c.start
  }
  return out
}
