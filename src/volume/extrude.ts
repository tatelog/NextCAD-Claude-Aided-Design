// 押し出し（D-02 C5）: 外形を階数分、階高で押し出す。高さ = 階数 × 階高。塔屋・手すりは含めない。
// 面積は切り取り前の外形から（段状の切り取り G27 は次の一枚）。
import { z } from 'zod'
import { polygonAreaMm2 } from '../geom/polygon'
import { PointMmSchema } from '../model/schema'

export const ExtrudeInputSchema = z.object({
  footprint: z.array(PointMmSchema).min(3),
  storey_count: z.number().int().min(1),
  storey_height: z.number().int().min(1),
})

export type ExtrudeInput = z.infer<typeof ExtrudeInputSchema>

export interface Volume {
  footprint: { x: number; y: number }[]
  storey_count: number
  storey_height: number
  /** mm */
  total_height: number
  /** 建築面積 mm² */
  building_area_mm2: number
  /** 延床面積 mm² */
  gross_floor_area_mm2: number
}

export function extrudeVolume(input: ExtrudeInput): Volume {
  const v = ExtrudeInputSchema.parse(input)
  const footprint = v.footprint.map((p) => ({ x: p.x, y: p.y }))
  const building_area_mm2 = polygonAreaMm2(footprint)
  return {
    footprint,
    storey_count: v.storey_count,
    storey_height: v.storey_height,
    total_height: v.storey_count * v.storey_height,
    building_area_mm2,
    gross_floor_area_mm2: building_area_mm2 * v.storey_count,
  }
}
