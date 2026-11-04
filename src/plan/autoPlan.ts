// P3 の自動作成（D-04 P3「柱割り・間取り・縦シャフトを作る」）。目標の戸数（1 階あたり）から、スパン数と建物の寸法を決める。
// 住戸の区画は candidateCells（仮置きの区画の作り方）で作り、countUnits で数え直す。決定論。
// 縦シャフトの数と EV は、住戸数と evLevels の結果から決める（EPS・DS の 1 個ずつは仮置き）。
import { z } from 'zod'
import { candidateCells } from './candidateCells'
import { countUnits } from './units'
import { buildEvLevels, type EvLevels } from './evLevels'
import { splitUnitRooms, type Room, type RoomPattern } from './rooms'
import type { CorridorLayout, Rect } from './candidateCells'
import { patternOfType, type UnitType } from './unitTypeMaster'
import { groupByFrontage, typeIdsOfSpans, type FrontageBlock } from './frontageBlocks'

const TargetSchema = z.number().int().positive()
// コアの寸法（仮置き）。階段は廊下の両端、EV ホールは中央。奥行の方向の長さ（mm）
const STAIR_LEN_MM = 3_000
const EV_HALL_LEN_MM = 3_000

export interface AutoPlanInput {
  /** 目標の戸数（1 階あたり、整数・1 以上） */
  targetPerFloor: number
  storeyCount: number
  storeyHeightMm: number
  spanMm: number
  unitDepthMm: number
  corridorMm: number
  layout: CorridorLayout
  evCount: number
  evStops: number[]
  /** 住戸タイプ（既定はファミリー）。単独は 2 室の間取りに固定 */
  unitType?: 'ファミリー' | '単独'
  /** 間取りパターン（既定は田の字）。角は両端の区画だけに使い、中の区画は田の字 */
  pattern?: RoomPattern
  /** 区画を残すか（曲線の外形の内側など。ハブ A-03 G5）。省略は全部の区画。外の区画は、作らず数えない */
  insideCell?: (cell: Rect) => boolean
  /** 住戸タイプのマスタ（T-08）。unitTypeIds の型を引く */
  unitTypes?: readonly UnitType[]
  /** 縦割り（柱割りの列）ごとに割り付ける型の id。型が少なければ繰り返す（G89）。省略は従来の部屋割り */
  unitTypeIds?: readonly string[]
}

export interface AutoCore {
  id: 'stairA' | 'stairB' | 'evHall'
  x0: number
  y0: number
  x1: number
  y1: number
  /** EV ホールだけ: EV の基数 */
  evCount?: number
}

export interface ShaftRect {
  id: string
  kind: 'PS' | 'EPS' | 'DS'
  /** PS の属する住戸の区画 ID */
  unitId?: string
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface AutoPlan {
  widthMm: number
  depthMm: number
  spans: number
  unitsPerFloor: number
  shortfall: number
  /** 住戸タイプ（指定が無ければファミリー）。P4 の住戸タイプ別の表示に使う（G61） */
  unitType: 'ファミリー' | '単独'
  shafts: { ps: number; eps: number; ds: number }
  ev: EvLevels
  /** 廊下と住戸の区画（1 階） */
  corridor: Rect
  cells: Rect[]
  /** 住戸の部屋割り（仮置き、区画ごと） */
  rooms: Room[]
  /** コア（廊下の中の階段 A・B と EV ホール）。モックの配置: 階段は廊下の両端、EV は中央 */
  cores: AutoCore[]
  /** 縦シャフトの位置（PS は住戸の水回りの廊下側の隅、EPS は階段 A の隅、DS は階段 B の隅） */
  shaftRects: ShaftRect[]
  /** 列ごとの住戸タイプ（id。割り付けが無い列は null）（G89） */
  spanTypes: (string | null)[]
  /** 室数が合う割り付けが無く、既定の割り付けで仮置きした列（列の番号。0 始まり） */
  unsupportedSpans: number[]
  /** 型を入れたとき、間口と合わず割り付けなしの列（列の番号。0 始まり。G99）。型を入れていないときは空 */
  unfitSpans: number[]
}

const SHAFT_MM = 600

// 縦シャフトの位置。PS は各住戸の水回りの、廊下側の隅。EPS・DS は階段 A・B の隅
function shaftsOf(cells: Rect[], rooms: Room[], cores: AutoCore[], corridor: Rect): ShaftRect[] {
  const out: ShaftRect[] = []
  const corridorMid = (corridor.x0 + corridor.x1) / 2
  for (const cell of cells) {
    const wet = rooms.find((r) => r.kind === '水回り' && r.id.startsWith(cell.id + '-'))
    if (!wet) continue
    // 廊下が右にある住戸は、水回りの右の隅に置く
    const cellMid = (cell.x0 + cell.x1) / 2
    const x0 = cellMid < corridorMid ? wet.x1 - SHAFT_MM : wet.x0
    out.push({ id: 'PS-' + cell.id, kind: 'PS', unitId: cell.id, x0, y0: wet.y0, x1: x0 + SHAFT_MM, y1: wet.y0 + SHAFT_MM })
  }
  const stairA = cores.find((c) => c.id === 'stairA')!
  const stairB = cores.find((c) => c.id === 'stairB')!
  out.push({ id: 'EPS', kind: 'EPS', x0: stairA.x0, y0: stairA.y0, x1: stairA.x0 + SHAFT_MM, y1: stairA.y0 + SHAFT_MM })
  out.push({ id: 'DS', kind: 'DS', x0: stairB.x1 - SHAFT_MM, y0: stairB.y1 - SHAFT_MM, x1: stairB.x1, y1: stairB.y1 })
  return out
}

/** その区画の寸法で、部屋割りができるか（割れない寸法は false） */
function canSplitRooms(cell: Rect, pattern: RoomPattern): boolean {
  try {
    splitUnitRooms(cell, pattern)
    return true
  } catch {
    return false
  }
}

/**
 * 柱列のまとまり（G99）ごとに、側（L・R）の区画をまとめて 1 区画にする。
 * まとめた区画の部屋割りが割れない、または型の室数に合う割り付けが無いまとまりは、まとめずに未対応として印を出す（黙って割らない）。
 * 区画が 1 つでも欠けるまとまり（曲線の外形などで外れた）は、まとめない。
 */
function mergeBlockCells(
  cells: Rect[],
  blocks: readonly FrontageBlock[],
  types: readonly UnitType[],
): { cells: Rect[]; typedPatterns: Map<number, RoomPattern>; unsupportedSpans: number[] } {
  const typedPatterns = new Map<number, RoomPattern>()
  const unsupportedSpans: number[] = []
  const byId = new Map(cells.map((c) => [c.id, c]))
  const sides = [...new Set(cells.map((c) => c.id.charAt(0)))]
  const mergedOf = new Map<string, Rect>()
  const blockOfSpan = new Map<number, FrontageBlock>()
  for (const b of blocks) {
    const end = b.start + b.count - 1
    const t = types.find((x) => x.id === b.typeId)
    const pattern = t === undefined ? null : patternOfType(t).pattern
    const parts = sides.map((side) => ({ side, first: byId.get(`${side}${b.start}`), last: byId.get(`${side}${end}`) }))
    const complete = parts.every((p) => p.first !== undefined && p.last !== undefined)
    if (!complete) continue
    const rects = parts.map((p) => ({ side: p.side, rect: { id: `${p.side}${b.start}`, x0: p.first!.x0, y0: p.first!.y0, x1: p.first!.x1, y1: p.last!.y1 } }))
    const fits = pattern !== null && rects.every((r) => canSplitRooms(r.rect, pattern))
    if (!fits) {
      for (let k = b.start; k <= end; k++) unsupportedSpans.push(k)
      continue
    }
    for (const r of rects) mergedOf.set(`${r.side}${b.start}`, r.rect)
    typedPatterns.set(b.start, pattern)
    for (let k = b.start; k <= end; k++) blockOfSpan.set(k, b)
  }
  const out: Rect[] = []
  for (const c of cells) {
    const k = Number(c.id.slice(1))
    const b = blockOfSpan.get(k)
    if (b === undefined) out.push(c)
    else if (k === b.start) out.push(mergedOf.get(`${c.id.charAt(0)}${b.start}`)!)
  }
  return { cells: out, typedPatterns, unsupportedSpans }
}

// 区画ごとの部屋割り。角は両端の区画（k = 0 と最後）だけ、他は田の字
// 型の割り付けがある列（typed）は、その型の部屋割り（G89）。ほかは従来どおり
function roomsFor(cells: Rect[], pattern: RoomPattern, typed: ReadonlyMap<number, RoomPattern>): Room[] {
  const last = cells.reduce((m, c) => Math.max(m, Number(c.id.slice(1))), 0)
  return cells.flatMap((c) => {
    const k = Number(c.id.slice(1))
    const isEnd = k === 0 || k === last
    const typedPattern = typed.get(k)
    if (typedPattern !== undefined) return splitUnitRooms(c, typedPattern)
    return splitUnitRooms(c, pattern === '角' && !isEnd ? '田の字' : pattern)
  })
}

export function generateAutoPlan(input: AutoPlanInput): AutoPlan {
  const target = TargetSchema.parse(input.targetPerFloor)
  // 1 スパンあたりの住戸: 中廊下・階段室は両側の 2 戸、片廊下・ツインは 1 戸
  const perSpan = input.layout === '中廊下' || input.layout === '階段室' ? 2 : 1
  const spans = Math.ceil(target / perSpan)
  const depthMm = spans * input.spanMm
  const widthMm =
    input.layout === '片廊下'
      ? input.unitDepthMm + input.corridorMm
      : input.layout === 'ツイン'
        ? input.unitDepthMm + 2 * input.corridorMm
        : 2 * input.unitDepthMm + input.corridorMm

  const c = candidateCells({
    width_mm: widthMm,
    depth_mm: depthMm,
    corridor_mm: input.corridorMm,
    unit_depth_mm: input.unitDepthMm,
    span_mm: input.spanMm,
    layout: input.layout,
  })
  const coresInCorridor: AutoCore[] = [
    { id: 'stairA', x0: c.corridor.x0, y0: 0, x1: c.corridor.x1, y1: STAIR_LEN_MM },
    { id: 'stairB', x0: c.corridor.x0, y0: depthMm - STAIR_LEN_MM, x1: c.corridor.x1, y1: depthMm },
  ]
  if (depthMm < 2 * STAIR_LEN_MM + EV_HALL_LEN_MM) throw new Error('奥行が短く、階段とEVホールを廊下に置けない')
  const evY0 = (depthMm - EV_HALL_LEN_MM) / 2
  if (!Number.isInteger(evY0)) throw new Error('奥行が奇数で、EV ホールを中央に置けない')
  coresInCorridor.push({ id: 'evHall', x0: c.corridor.x0, y0: evY0, x1: c.corridor.x1, y1: evY0 + EV_HALL_LEN_MM, evCount: input.evCount })
  // 曲線の外形などで外れる区画は、作らず数えない（G5）
  const perSpanCells = input.insideCell ? c.cells.filter(input.insideCell) : c.cells
  // 列の型（G89・G99）: 柱列を 1 本から順にまとめ、まとめた幅が間口の整数倍になる最小の範囲に、型を 1 つ置く。
  // まとめた範囲は 1 区画になり、その型の部屋割りになる。どの範囲も合わない列は「割り付けなし（間口と合わない）」
  const selected = (input.unitTypeIds ?? [])
    .map((id) => input.unitTypes?.find((x) => x.id === id))
    .filter((t): t is UnitType => t !== undefined)
  const grouping = groupByFrontage(
    Array.from({ length: spans }, () => input.spanMm),
    selected.map((t) => ({ id: t.id, frontageMm: t.frontage_mm })),
  )
  const spanTypes = typeIdsOfSpans(grouping, spans)
  const merged = mergeBlockCells(perSpanCells, grouping.blocks, input.unitTypes ?? [])
  const cells = merged.cells
  const counted = countUnits({
    outline: [
      { x: 0, y: 0 },
      { x: widthMm, y: 0 },
      { x: widthMm, y: depthMm },
      { x: 0, y: depthMm },
    ],
    corridors: c.corridors,
    cores: coresInCorridor,
    cells,
  })
  const unitsPerFloor = counted.usable_count
  const unsupportedSpans = merged.unsupportedSpans
  // 型を入れていないときは、割り付けなし（間口と合わない）とは出さない
  const unfitSpans = selected.length === 0 ? [] : grouping.unallocated
  const rooms = roomsFor(cells, input.unitType === '単独' ? '単独' : (input.pattern ?? '田の字'), merged.typedPatterns)

  return {
    unitType: input.unitType ?? 'ファミリー',
    widthMm,
    depthMm,
    spans,
    unitsPerFloor,
    shortfall: Math.max(0, target - unitsPerFloor),
    shafts: { ps: unitsPerFloor, eps: 1, ds: 1 },
    corridor: c.corridor,
    cells,
    rooms,
    cores: coresInCorridor,
    shaftRects: shaftsOf(cells, rooms, coresInCorridor, c.corridor),
    spanTypes,
    unsupportedSpans,
    unfitSpans,
    ev: buildEvLevels({
      storeyCount: input.storeyCount,
      storeyHeightMm: input.storeyHeightMm,
      evStops: input.evStops,
      evCount: input.evCount,
    }),
  }
}
