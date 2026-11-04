// 斜線で切った後の形で、建築面積・延床面積・容積率を再計算する（A-03 G27 B、D-02 C5）。
// 建築面積は 1 階の切り取り後の面積（上の階は下の階の内側に収まるので、建築面積は 1 階で決まる）。
import { polygonAreaMm2 } from '../geom/polygon'
import { z } from 'zod'
import { cutFloors, type SlopeBoundary } from './slope'
import { extrudeVolume, type ExtrudeInput } from './extrude'

export interface CutVolume {
  floor_areas_mm2: number[]
  building_area_mm2: number
  gross_floor_area_mm2: number
  /** 容積率（比）。延床面積 ÷ 敷地面積 */
  floor_area_ratio: number
}

export function volumeAfterSlope(input: ExtrudeInput, boundaries: readonly SlopeBoundary[], parcelAreaMm2: number): CutVolume {
  const parcel = z.number().positive().parse(parcelAreaMm2)
  const v = extrudeVolume(input)
  const floors = cutFloors(v.footprint, boundaries, { storey_count: v.storey_count, storey_height: v.storey_height })
  const floorAreas = floors.map((f) => polygonAreaMm2(f))
  const gross = floorAreas.reduce((sum, a) => sum + a, 0)
  return {
    floor_areas_mm2: floorAreas,
    building_area_mm2: floorAreas[0] ?? 0,
    gross_floor_area_mm2: gross,
    floor_area_ratio: gross / parcel,
  }
}
