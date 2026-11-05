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
import { groupByFrontage, typeIdsOfSpans, type FrontageGrouping, type FrontageUnit } from './frontageBlocks'
import { evHallLenMm, shaftSizeMm } from './coreDims'

const TargetSchema = z.number().int().positive()
// コアの寸法（仮置き）。階段は廊下の両端、EV ホールは中央。奥行の方向の長さ（mm）
const STAIR_LEN_MM = 3_000
// EV ホールの奥行は差し替えられるブロック（coreDims。G138）から出す
const EV_HALL_LEN_MM = evHallLenMm()

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
  /** 階段室型のしつらえ（統括の決定 G107）。既定は屋内シャフト。階段室以外では使わない */
  stairFinish?: StairFinish
  /** 外形の幅・奥行き（mm）。あれば、その寸法の中に住戸を外形いっぱいに割り付ける。目標の戸数は寸法を決めず、外形に入る数と比べる（統括の依頼 2026-11-06。依頼 C）。無ければ目標の戸数から寸法を決める */
  outline?: { widthMm: number; depthMm: number }
}

/** 階段室のしつらえ: 屋内シャフト（全部屋内）／外部階段（4 面のうち 2 面がアルミスリット、外壁に接する） */
export type StairFinish = 'indoorShaft' | 'outdoorSlit'

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
  /** 廊下タイプ（ツインの廊下を取り直すときに使う。P4 の左メニューの入力など） */
  layout: CorridorLayout
  /** 階段室のしつらえ（階段室のときだけ。ほかは null）（G107） */
  stairFinish: StairFinish | null
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
  /** 仮の間口で置いた列（未確認の型、または範囲が無い列。要確認。列の番号。0 始まり。G99・統括の訂正） */
  provisionalSpans: number[]
  /** 余りの列を前の住戸に吸収した列（要確認。列の番号。0 始まり） */
  absorbedSpans: number[]
}

// 縦シャフトの位置。寸法は coreDims（差し替えられるブロック。G138）から出す。PS は各住戸の水回りの、廊下側の隅。EPS・DS は階段 A・B の隅
function shaftsOf(cells: Rect[], rooms: Room[], cores: AutoCore[], corridor: Rect): ShaftRect[] {
  const out: ShaftRect[] = []
  const corridorMid = (corridor.x0 + corridor.x1) / 2
  const ps = shaftSizeMm('PS')
  const eps = shaftSizeMm('EPS')
  const ds = shaftSizeMm('DS')
  for (const cell of cells) {
    const wet = rooms.find((r) => r.kind === '水回り' && r.id.startsWith(cell.id + '-'))
    if (!wet) continue
    // 廊下が右にある住戸は、水回りの右の隅に置く
    const cellMid = (cell.x0 + cell.x1) / 2
    const x0 = cellMid < corridorMid ? wet.x1 - ps : wet.x0
    out.push({ id: 'PS-' + cell.id, kind: 'PS', unitId: cell.id, x0, y0: wet.y0, x1: x0 + ps, y1: wet.y0 + ps })
  }
  const stairA = cores.find((c) => c.id === 'stairA')!
  const stairB = cores.find((c) => c.id === 'stairB')!
  out.push({ id: 'EPS', kind: 'EPS', x0: stairA.x0, y0: stairA.y0, x1: stairA.x0 + eps, y1: stairA.y0 + eps })
  out.push({ id: 'DS', kind: 'DS', x0: stairB.x1 - ds, y0: stairB.y1 - ds, x1: stairB.x1, y1: stairB.y1 })
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

/** 住戸の区画の元（側ごとの区画と、型の部屋割り） */
interface PlanUnit {
  y0: number
  y1: number
  /** 側ごとの区画（L・R） */
  rects: Map<string, Rect>
  /** 型の部屋割り（G89）。型が割れる住戸だけ */
  typed: RoomPattern | null
}

/** 列の並び（first から last まで）を、列ごとの区画のまま */
function perSpanUnits(spanCell: ReadonlyMap<string, Rect>, sides: readonly string[], first: number, last: number): PlanUnit[] {
  const out: PlanUnit[] = []
  for (let k = first; k <= last; k++) {
    const rects = new Map<string, Rect>()
    for (const side of sides) {
      const cell = spanCell.get(`${side}${k}`)
      if (cell) rects.set(side, cell)
    }
    const any = rects.values().next().value
    if (any !== undefined) out.push({ y0: any.y0, y1: any.y1, rects, typed: null })
  }
  return out
}

/**
 * 住戸の並び（G99・統括の訂正）を区画にする。1 戸が 1 列より広いときは、その幅の 1 区画にする（N 戸の範囲は N 区画に分ける）。
 * 住戸の型の部屋割りが割れない、または室数に合う割り付けが無い住戸があれば、その範囲は列ごとの区画に戻し、未対応として印を出す（黙って割らない）。
 * 区画が 1 つでも欠ける範囲（曲線の外形などで外れた）は、まとめず列ごとの区画のまま。
 * 区画の id は住戸の順番（0 始まり）。
 */
function unitCells(
  perSpanCells: Rect[],
  grouping: FrontageGrouping,
  types: readonly UnitType[],
): { cells: Rect[]; typedById: Map<string, RoomPattern>; unsupportedSpans: number[] } {
  const sides = [...new Set(perSpanCells.map((c) => c.id.charAt(0)))]
  const spanCell = new Map(perSpanCells.map((c) => [c.id, c]))
  const yBase = Math.min(...perSpanCells.map((c) => c.y0))
  const units: PlanUnit[] = []
  const unsupportedSpans: number[] = []

  const byGroup = new Map<number, FrontageUnit[]>()
  for (const u of grouping.units) byGroup.set(u.group, [...(byGroup.get(u.group) ?? []), u])
  for (const members of byGroup.values()) {
    const first = Math.min(...members.map((u) => u.firstColumn))
    const last = Math.max(...members.map((u) => u.lastColumn))
    const complete = sides.every((side) => {
      for (let k = first; k <= last; k++) if (!spanCell.has(`${side}${k}`)) return false
      return true
    })
    if (!complete) {
      units.push(...perSpanUnits(spanCell, sides, first, last))
      continue
    }
    const built: PlanUnit[] = []
    let fits = true
    for (const u of members) {
      const t = types.find((x) => x.id === u.typeId)
      const pattern = t === undefined ? null : patternOfType(t).pattern
      const rects = new Map<string, Rect>()
      for (const side of sides) {
        const col = spanCell.get(`${side}${u.firstColumn}`)!
        rects.set(side, { id: `${side}-unit`, x0: col.x0, y0: yBase + u.startMm, x1: col.x1, y1: yBase + u.startMm + u.widthMm })
      }
      const ok = pattern !== null && [...rects.values()].every((r) => canSplitRooms(r, pattern))
      if (!ok) fits = false
      built.push({ y0: yBase + u.startMm, y1: yBase + u.startMm + u.widthMm, rects, typed: ok ? pattern : null })
    }
    if (fits) units.push(...built)
    else {
      for (let k = first; k <= last; k++) unsupportedSpans.push(k)
      units.push(...perSpanUnits(spanCell, sides, first, last))
    }
  }

  units.sort((a, b) => a.y0 - b.y0)
  const cells: Rect[] = []
  const typedById = new Map<string, RoomPattern>()
  units.forEach((unit, ordinal) => {
    for (const side of sides) {
      const rect = unit.rects.get(side)
      if (rect === undefined) continue
      const id = `${side}${ordinal}`
      cells.push({ ...rect, id })
      if (unit.typed !== null) typedById.set(id, unit.typed)
    }
  })
  return { cells, typedById, unsupportedSpans: [...new Set(unsupportedSpans)].sort((a, b) => a - b) }
}

/** 住戸の列の番号（重なりを除いて昇順） */
function spansOf(units: readonly FrontageUnit[]): number[] {
  const out = new Set<number>()
  for (const u of units) for (let k = u.firstColumn; k <= u.lastColumn; k++) out.add(k)
  return [...out].sort((a, b) => a - b)
}

// 区画ごとの部屋割り。角は両端の区画（k = 0 と最後）だけ、他は田の字
// 型の割り付けがある列（typed）は、その型の部屋割り（G89）。ほかは従来どおり
function roomsFor(cells: Rect[], pattern: RoomPattern, typed: ReadonlyMap<string, RoomPattern>): Room[] {
  const minY = Math.min(...cells.map((c) => c.y0))
  const maxY = Math.max(...cells.map((c) => c.y0))
  return cells.flatMap((c) => {
    const isEnd = c.y0 === minY || c.y0 === maxY
    const typedPattern = typed.get(c.id)
    if (typedPattern !== undefined) return splitUnitRooms(c, typedPattern)
    return splitUnitRooms(c, pattern === '角' && !isEnd ? '田の字' : pattern)
  })
}

export function generateAutoPlan(input: AutoPlanInput): AutoPlan {
  const target = TargetSchema.parse(input.targetPerFloor)
  // 1 スパンあたりの住戸: 中廊下・階段室・ツインは両側の 2 戸（ツインは中廊下の変形。G106）、片廊下は 1 戸
  const perSpan = input.layout === '片廊下' ? 1 : 2
  // 外形があれば、その寸法の中に割り付ける（依頼 C）。スパン数は奥行の切り捨て。目標の戸数は寸法を決めない
  const spans = input.outline ? Math.floor(input.outline.depthMm / input.spanMm) : Math.ceil(target / perSpan)
  if (spans < 1) throw new Error('外形の奥行がスパンより短い')
  const depthMm = input.outline ? input.outline.depthMm : spans * input.spanMm
  const widthMm = input.outline
    ? input.outline.widthMm
    : input.layout === '片廊下'
      ? input.unitDepthMm + input.corridorMm
      : input.layout === 'ツイン'
        ? 2 * input.unitDepthMm + 3 * input.corridorMm
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
  // 中央からずれる 1 mm（奥行が奇数のとき）は上側に寄せる（依頼 C）
  const evY0 = Math.floor((depthMm - EV_HALL_LEN_MM) / 2)
  coresInCorridor.push({ id: 'evHall', x0: c.corridor.x0, y0: evY0, x1: c.corridor.x1, y1: evY0 + EV_HALL_LEN_MM, evCount: input.evCount })
  // 曲線の外形などで外れる区画は、作らず数えない（G5）
  const perSpanCells = input.insideCell ? c.cells.filter(input.insideCell) : c.cells
  // 列の型（G89・G99・統括の訂正）: 柱列を 1 本から順にまとめ、まとめた幅が間口の整数倍になる最小の範囲に、型を 1 つ置く（N 戸に分ける）。
  // 範囲に入らない列は、未確認の型の仮の間口（列の幅）か、前の住戸への吸収（要確認）。割り付けなしは作らない
  const selected = (input.unitTypeIds ?? [])
    .map((id) => input.unitTypes?.find((x) => x.id === id))
    .filter((t): t is UnitType => t !== undefined)
  const grouping = groupByFrontage(
    Array.from({ length: spans }, () => input.spanMm),
    selected.map((t) => ({ id: t.id, frontageMm: t.frontage_mm })),
  )
  const spanTypes = typeIdsOfSpans(grouping)
  // 型を入れていなければ、列ごとの区画のまま（従来どおり）
  const merged =
    selected.length === 0
      ? { cells: perSpanCells, typedById: new Map<string, RoomPattern>(), unsupportedSpans: [] as number[] }
      : unitCells(perSpanCells, grouping, input.unitTypes ?? [])
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
  // 仮の間口・余りの吸収（要確認）。型を入れていなければ空
  const provisionalSpans = spansOf(grouping.units.filter((u) => u.provisional))
  const absorbedSpans = spansOf(grouping.units.filter((u) => u.absorbed))
  const rooms = roomsFor(cells, input.unitType === '単独' ? '単独' : (input.pattern ?? '田の字'), merged.typedById)

  return {
    unitType: input.unitType ?? 'ファミリー',
    layout: input.layout,
    stairFinish: input.layout === '階段室' ? (input.stairFinish ?? 'indoorShaft') : null,
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
    provisionalSpans,
    absorbedSpans,
    ev: buildEvLevels({
      storeyCount: input.storeyCount,
      storeyHeightMm: input.storeyHeightMm,
      evStops: input.evStops,
      evCount: input.evCount,
    }),
  }
}
