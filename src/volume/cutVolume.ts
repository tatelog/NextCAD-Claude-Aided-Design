// 斜線で切った後の形で、建築面積・延床面積・容積率を再計算する（A-03 G27 B、D-02 C5）。
// 建築面積は 1 階の切り取り後の面積（上の階は下の階の内側に収まるので、建築面積は 1 階で決まる）。
import { polygonAreaMm2 } from '../geom/polygon'
import { z } from 'zod'
import { cutFloorParts, type SlopeBoundary } from './slope'
import { extrudeVolume, type ExtrudeInput } from './extrude'

export interface CutVolume {
  floor_areas_mm2: number[]
  building_area_mm2: number
  gross_floor_area_mm2: number
  /** 容積率（比）。延床面積 ÷ 敷地面積 */
  floor_area_ratio: number
}

/** 切り取った階ごとの面積（mm²）を、外形・境界・今の階数から計算する（統括の依頼 2026-11-06。依頼 B）。
 * 境界が無いときは、外形の面積を各階に持つ（押し出しと同じ）。P4・P5 が、階数を P2 を開かずに変えても古い値を使わないために使う */
export function cutFloorAreasOf(
  footprint: readonly { x: number; y: number }[],
  boundaries: readonly SlopeBoundary[] | null,
  storeys: { storey_count: number; storey_height: number },
): number[] {
  return volumeAfterSlope({ footprint: footprint.map((p) => ({ x: p.x, y: p.y })), ...storeys }, boundaries ?? [], 1).floor_areas_mm2
}

/** P5 の延床面積（統括の依頼 2026-11-06。依頼 5a）: 切り取った階の面積の和。階の面積が無い・階数が合わないときは、押し出しの延床面積のまま */
export function grossFloorAreaMm2(extrudeGrossMm2: number, floorAreasMm2: readonly number[] | undefined, storeyCount: number): number {
  if (floorAreasMm2 === undefined || floorAreasMm2.length !== storeyCount) return extrudeGrossMm2
  return floorAreasMm2.reduce((sum, a) => sum + a, 0)
}

export function volumeAfterSlope(input: ExtrudeInput, boundaries: readonly SlopeBoundary[], parcelAreaMm2: number): CutVolume {
  const parcel = z.number().positive().parse(parcelAreaMm2)
  const v = extrudeVolume(input)
  const floors = cutFloorParts(v.footprint, boundaries, { storey_count: v.storey_count, storey_height: v.storey_height })
  const floorAreas = floors.map((f) => f.reduce((sum, p) => sum + polygonAreaMm2(p), 0))
  const gross = floorAreas.reduce((sum, a) => sum + a, 0)
  return {
    floor_areas_mm2: floorAreas,
    building_area_mm2: floorAreas[0] ?? 0,
    gross_floor_area_mm2: gross,
    floor_area_ratio: gross / parcel,
  }
}
