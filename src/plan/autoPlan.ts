// P3 の自動作成（D-04 P3「柱割り・間取り・縦シャフトを作る」）。目標の戸数（1 階あたり）から、スパン数と建物の寸法を決める。
// 住戸の区画は candidateCells（仮置きの区画の作り方）で作り、countUnits で数え直す。決定論。
// 縦シャフトの数と EV は、住戸数と evLevels の結果から決める（EPS・DS の 1 個ずつは仮置き）。
import { z } from 'zod'
import { candidateCells } from './candidateCells'
import { countUnits } from './units'
import { buildEvLevels, type EvLevels } from './evLevels'
import { roomsOfCells, type Room } from './rooms'
import type { Rect } from './candidateCells'

const TargetSchema = z.number().int().positive()

export interface AutoPlanInput {
  /** 目標の戸数（1 階あたり、整数・1 以上） */
  targetPerFloor: number
  storeyCount: number
  storeyHeightMm: number
  spanMm: number
  unitDepthMm: number
  corridorMm: number
  layout: '中廊下' | '片廊下'
  evCount: number
  evStops: number[]
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
}

export function generateAutoPlan(input: AutoPlanInput): AutoPlan {
  const target = TargetSchema.parse(input.targetPerFloor)
  const perSpan = input.layout === '中廊下' ? 2 : 1
  const spans = Math.ceil(target / perSpan)
  const depthMm = spans * input.spanMm
  const widthMm = input.layout === '中廊下' ? 2 * input.unitDepthMm + input.corridorMm : input.unitDepthMm + input.corridorMm

  const c = candidateCells({
    width_mm: widthMm,
    depth_mm: depthMm,
    corridor_mm: input.corridorMm,
    unit_depth_mm: input.unitDepthMm,
    span_mm: input.spanMm,
    layout: input.layout,
  })
  const counted = countUnits({
    outline: [
      { x: 0, y: 0 },
      { x: widthMm, y: 0 },
      { x: widthMm, y: depthMm },
      { x: 0, y: depthMm },
    ],
    corridors: [c.corridor],
    cores: [],
    cells: c.cells,
  })
  const unitsPerFloor = counted.usable_count

  return {
    widthMm,
    depthMm,
    spans,
    unitsPerFloor,
    shortfall: Math.max(0, target - unitsPerFloor),
    shafts: { ps: unitsPerFloor, eps: 1, ds: 1 },
    corridor: c.corridor,
    cells: c.cells,
    rooms: roomsOfCells(c.cells),
    ev: buildEvLevels({
      storeyCount: input.storeyCount,
      storeyHeightMm: input.storeyHeightMm,
      evStops: input.evStops,
      evCount: input.evCount,
    }),
  }
}
