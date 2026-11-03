// P3 の自動作成（D-04 P3「柱割り・間取り・縦シャフトを作る」）。目標の戸数（1 階あたり）から、スパン数と建物の寸法を決める。
// 住戸の区画は candidateCells（仮置きの区画の作り方）で作り、countUnits で数え直す。決定論。
// 縦シャフトの数と EV は、住戸数と evLevels の結果から決める（EPS・DS の 1 個ずつは仮置き）。
import { z } from 'zod'
import { candidateCells } from './candidateCells'
import { countUnits } from './units'
import { buildEvLevels, type EvLevels } from './evLevels'
import { splitUnitRooms, type Room, type RoomPattern } from './rooms'
import type { CorridorLayout, Rect } from './candidateCells'

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

// 区画ごとの部屋割り。角は両端の区画（k = 0 と最後）だけ、他は田の字
function roomsFor(cells: Rect[], pattern: RoomPattern): Room[] {
  const last = cells.reduce((m, c) => Math.max(m, Number(c.id.slice(1))), 0)
  return cells.flatMap((c) => {
    const k = Number(c.id.slice(1))
    const isEnd = k === 0 || k === last
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
  const counted = countUnits({
    outline: [
      { x: 0, y: 0 },
      { x: widthMm, y: 0 },
      { x: widthMm, y: depthMm },
      { x: 0, y: depthMm },
    ],
    corridors: c.corridors,
    cores: coresInCorridor,
    cells: c.cells,
  })
  const unitsPerFloor = counted.usable_count
  const rooms = roomsFor(c.cells, input.unitType === '単独' ? '単独' : (input.pattern ?? '田の字'))

  return {
    widthMm,
    depthMm,
    spans,
    unitsPerFloor,
    shortfall: Math.max(0, target - unitsPerFloor),
    shafts: { ps: unitsPerFloor, eps: 1, ds: 1 },
    corridor: c.corridor,
    cells: c.cells,
    rooms,
    cores: coresInCorridor,
    shaftRects: shaftsOf(c.cells, rooms, coresInCorridor, c.corridor),
    ev: buildEvLevels({
      storeyCount: input.storeyCount,
      storeyHeightMm: input.storeyHeightMm,
      evStops: input.evStops,
      evCount: input.evCount,
    }),
  }
}
