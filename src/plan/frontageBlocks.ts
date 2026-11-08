// 住戸の割り付けの単位（ハブ A-03 G99、統括の依頼 t56・統括の補足 2026-11-04・統括の訂正 2026-11-04）。決定論。
// 隣り合う柱列を 1 本から順にまとめ、まとめた幅が 間口 × N（N は 1 以上の整数）になる最小の範囲に、1 タイプを置く。N 戸に分ける。
// 範囲に入らない余りの列は、未確認の型があれば列の幅で仮置きし、無ければ前の範囲の最後の住戸に吸収する（先頭は次の範囲）。
// 範囲が一つも無いときは、列ごとに先頭の型を列の幅で仮置きする。どの型も候補から外さず、割り付けなし（列が空く）は作らない。

export interface FrontageType {
  id: string
  /** 間口（mm）。未確認（null）の型は、余りの列に仮の間口（列の幅）で置く */
  frontageMm: number | null
}

/** 住戸 1 戸。startMm は列の左端からの位置（mm） */
export interface FrontageUnit {
  typeId: string
  startMm: number
  widthMm: number
  /** 含む最初と最後の列（0 始まり）。住戸の端が列の途中なら、その列も含む */
  firstColumn: number
  lastColumn: number
  /** 仮の間口（未確認の型、または範囲が無い列に、列の幅で置いた。要確認） */
  provisional: boolean
  /** 余りの列を吸収した（要確認） */
  absorbed: boolean
  /** まとまりの番号（0 始まり）。同じ範囲（または同じ余りの列）の住戸は、同じ番号 */
  group: number
}

export interface FrontageColumn {
  startMm: number
  widthMm: number
}

export interface FrontageGrouping {
  /** 住戸の並び（左から） */
  units: FrontageUnit[]
  /** 柱列の並び（左から。列の幅と左端） */
  columns: FrontageColumn[]
}

interface Block {
  first: number
  last: number
  typeId: string
  frontageMm: number
}

const isKnown = (t: FrontageType): t is FrontageType & { frontageMm: number } => t.frontageMm !== null && t.frontageMm > 0

/** 1 本目から順に、まとめた幅が間口の整数倍になる最小の範囲を探す。同じ範囲に合う型は、型の並びで先の型 */
function findBlocks(widths: readonly number[], known: readonly (FrontageType & { frontageMm: number })[]): Block[] {
  const blocks: Block[] = []
  let i = 0
  while (i < widths.length) {
    let total = 0
    let hit: Block | undefined
    for (let j = i; j < widths.length && hit === undefined; j++) {
      total += widths[j]!
      for (const t of known) {
        if (total % t.frontageMm === 0) {
          hit = { first: i, last: j, typeId: t.id, frontageMm: t.frontageMm }
          break
        }
      }
    }
    if (hit === undefined) i += 1
    else {
      blocks.push(hit)
      i = hit.last + 1
    }
  }
  return blocks
}

/** 柱列の幅の並びと型から、住戸の並びを作る。決定論（同じ入力には同じ出力。入力は書き換えない） */
export function groupByFrontage(spanWidthsMm: readonly number[], types: readonly FrontageType[]): FrontageGrouping {
  const columns: FrontageColumn[] = []
  let x = 0
  for (const w of spanWidthsMm) {
    columns.push({ startMm: x, widthMm: w })
    x += w
  }
  if (types.length === 0) return { units: [], columns }

  const known = types.filter(isKnown)
  const unknown = types.filter((t) => !isKnown(t))
  const blocks = findBlocks(spanWidthsMm, known)
  const inBlock = new Set<number>()
  for (const b of blocks) for (let k = b.first; k <= b.last; k++) inBlock.add(k)
  const gaps = columns.map((_, k) => k).filter((k) => !inBlock.has(k))
  // 余りの列を前の範囲に吸収するのは、未確認の型が無く、範囲がある場合だけ。先頭の余りは最初の範囲へ
  const absorbing = gaps.length > 0 && unknown.length === 0 && blocks.length > 0
  const lead = new Array<number>(blocks.length).fill(0)
  const trail = new Array<number>(blocks.length).fill(0)
  if (absorbing) {
    for (const k of gaps) {
      const prev = blocks.reduce((found, b, idx) => (b.last < k ? idx : found), -1)
      if (prev >= 0) trail[prev]! += columns[k]!.widthMm
      else lead[0]! += columns[k]!.widthMm
    }
  }

  const colAt = (mm: number): number => {
    const idx = columns.findIndex((c) => mm >= c.startMm && mm < c.startMm + c.widthMm)
    return idx < 0 ? columns.length - 1 : idx
  }
  const units: FrontageUnit[] = []
  let group = 0
  let gapCount = 0
  let k = 0
  while (k < columns.length) {
    const bi = blocks.findIndex((b) => b.first === k)
    if (bi >= 0) {
      const b = blocks[bi]!
      const total = columns[b.last]!.startMm + columns[b.last]!.widthMm - columns[b.first]!.startMm
      const n = total / b.frontageMm
      let startMm = columns[b.first]!.startMm - lead[bi]!
      for (let u = 0; u < n; u++) {
        const fromLead = u === 0 ? lead[bi]! : 0
        const fromTrail = u === n - 1 ? trail[bi]! : 0
        const widthMm = b.frontageMm + fromLead + fromTrail
        units.push({
          typeId: b.typeId,
          startMm,
          widthMm,
          firstColumn: colAt(startMm),
          lastColumn: colAt(startMm + widthMm - 1),
          provisional: false,
          absorbed: fromLead > 0 || fromTrail > 0,
          group,
        })
        startMm += widthMm
      }
      group += 1
      k = b.last + 1
    } else {
      if (!absorbing) {
        // 未確認の型は、余りの列に順に繰り返す。未確認の型が無ければ、先頭の型を列の幅で仮置き
        const t = unknown.length > 0 ? unknown[gapCount % unknown.length]! : types[0]!
        const col = columns[k]!
        units.push({
          typeId: t.id,
          startMm: col.startMm,
          widthMm: col.widthMm,
          firstColumn: k,
          lastColumn: k,
          provisional: true,
          absorbed: false,
          group,
        })
        gapCount += 1
        group += 1
      }
      k += 1
    }
  }
  return { units, columns }
}

/** 列ごとの型の id（列の中央の位置に入る住戸の型）。型が無ければ null */
export function typeIdsOfSpans(grouping: FrontageGrouping): (string | null)[] {
  return grouping.columns.map((c) => {
    const mid = c.startMm + c.widthMm / 2
    const unit = grouping.units.find((u) => mid >= u.startMm && mid < u.startMm + u.widthMm)
    return unit?.typeId ?? null
  })
}
