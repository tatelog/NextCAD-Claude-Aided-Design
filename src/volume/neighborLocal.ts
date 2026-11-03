// 周辺建物を、P2 の 3D の座標（mm）に置く。基準点（P1 の地点）を敷地の中心に合わせ、平面直角座標系の方角（x が東、y が北）を保つ。
import type { Point } from '../geom/viewport'
import type { PlateauBuilding } from '../plateau/bldg'
import { toPlaneMm } from '../plateau/neighborBuildings'

export interface NeighborVolume {
  footprint: Point[]
  heightMm: number
}

export function neighborVolumes(
  buildings: readonly PlateauBuilding[],
  origin: { lat: number; lon: number },
  center: Point,
): NeighborVolume[] {
  const out: NeighborVolume[] = []
  for (const b of buildings) {
    // 高さが不明の建物は表示しない（推測で高さを入れない）
    if (b.heightM === null) continue
    for (const ring of b.footprints) {
      const footprint = ring.map((p) => {
        const d = toPlaneMm(p, origin)
        return { x: center.x + d.x, y: center.y + d.y }
      })
      out.push({ footprint, heightMm: b.heightM * 1000 })
    }
  }
  return out
}
