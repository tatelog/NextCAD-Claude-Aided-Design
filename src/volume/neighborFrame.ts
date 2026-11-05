// 周辺建物を、確定した筆の枠で平面（mm）に置く（統括の依頼 2026-11-06。2）。筆と同じ写し方なので、筆とずれない。決定論。
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
