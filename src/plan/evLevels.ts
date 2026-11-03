// 階別データ（A-03 G17、D-04 P2・P3）。EV は昇降路が通る階・停止階・ホール確保階を階別に持つ。
// 階数・階高は D-03 E-09 の storey_count / storey_height と揃える（階高は mm の整数）。
// 昇降路は全階を通る。ホール確保は停止階と同じ扱い（この段階）。停止しない階は unreachable_storeys に返す。
import { z } from 'zod'

const InputSchema = z
  .object({
    storeyCount: z.number().int().min(1),
    storeyHeightMm: z.number().int().min(1),
    evStops: z.array(z.number().int()),
    evCount: z.number().int().min(0),
  })
  .refine((v) => v.evStops.every((s) => s >= 1 && s <= v.storeyCount), {
    message: '停止階は 1 から階数までの範囲で指定する',
    path: ['evStops'],
  })

export type EvLevelsInput = z.input<typeof InputSchema>

export interface EvLevelStorey {
  storey: number
  shaft: boolean
  ev_stop: boolean
  hall: boolean
  z_from_mm: number
  z_to_mm: number
}

export interface EvCore {
  id: string
  shaft_storeys: number[]
  stop_storeys: number[]
  hall_storeys: number[]
}

export interface EvLevels {
  storey_count: number
  storey_height: number
  total_height: number
  storeys: EvLevelStorey[]
  ev_cores: EvCore[]
  unreachable_storeys: number[]
}

export function buildEvLevels(input: EvLevelsInput): EvLevels {
  const v = InputSchema.parse(input)
  const stops = [...new Set(v.evStops)].sort((a, b) => a - b)
  const stopSet = new Set(stops)

  const storeys: EvLevelStorey[] = Array.from({ length: v.storeyCount }, (_, i) => ({
    storey: i + 1,
    shaft: true,
    ev_stop: stopSet.has(i + 1),
    hall: stopSet.has(i + 1),
    z_from_mm: i * v.storeyHeightMm,
    z_to_mm: (i + 1) * v.storeyHeightMm,
  }))

  const allStoreys = storeys.map((s) => s.storey)
  const ev_cores: EvCore[] = Array.from({ length: v.evCount }, (_, i) => ({
    id: `ev-${i + 1}`,
    shaft_storeys: [...allStoreys],
    stop_storeys: [...stops],
    hall_storeys: [...stops],
  }))

  return {
    storey_count: v.storeyCount,
    storey_height: v.storeyHeightMm,
    total_height: v.storeyCount * v.storeyHeightMm,
    storeys,
    ev_cores,
    unreachable_storeys: storeys.filter((s) => !s.hall).map((s) => s.storey),
  }
}
