// 周辺建物を、確定した筆の枠で平面（mm）に置く（統括の依頼 2026-11-06。2）。筆と同じ写し方なので、筆とずれない。決定論。
import type { Point } from '../geom/viewport'
import { planeOfLonLat, type ParcelFrame } from '../map/parcelPlane'
import type { PlateauBuilding } from '../plateau/bldg'
import type { NeighborVolume } from './neighborLocal'

/** 周辺建物（高さが分かるもの）の底面を、筆の枠で平面にする。高さが不明の建物は出さない */
export function neighborVolumesInFrame(buildings: readonly PlateauBuilding[], frame: ParcelFrame): NeighborVolume[] {
  const out: NeighborVolume[] = []
  for (const b of buildings) {
    if (b.heightM === null) continue
    for (const ring of b.footprints) {
      const footprint = ring.map((p) => planeOfLonLat(frame, p.lon, p.lat))
      out.push({ footprint, heightMm: b.heightM * 1000 })
    }
  }
  return out
}

/** 周辺建物の輪郭（平面 mm）。確定した筆の枠で置く（2D の作図画面に敷く。統括の依頼 2026-11-06。5）。枠が無いとき（筆が無い確定）は出さない */
export function neighborOutlinesOf(buildings: readonly PlateauBuilding[], frame: ParcelFrame | null): Point[][] {
  if (frame === null) return []
  return neighborVolumesInFrame(buildings, frame).map((v) => v.footprint)
}
