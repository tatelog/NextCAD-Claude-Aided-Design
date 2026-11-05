// 周辺建物の立体（統括の依頼 2026-11-06（急ぎ））。押し出しの整数の検査（extrudeVolume）を通さずに、三角形を直接作る。
// 確定した筆の枠で置いた周辺建物は、座標も高さも小数になるため。壊れた一棟は null（その一棟だけ飛ばす）。決定論。
import type { Point } from '../geom/viewport'
import { polygonAreaMm2 } from '../geom/polygon'
import { prismTriangles, type VolumeMesh } from './mesh'

/** 周辺建物の一棟の立体。座標と高さは小数でよい。壊れている（点が 3 つ未満・面積 0・数でない値）ときは null */
export function neighborMeshOf(footprint: readonly Point[], heightMm: number): VolumeMesh | null {
  if (!Number.isFinite(heightMm) || heightMm <= 0) return null
  if (footprint.length < 3) return null
  if (footprint.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null
  const area = Math.abs(polygonAreaMm2(footprint))
  if (!Number.isFinite(area) || area <= 0) return null
  try {
    return { total_height: heightMm, triangles: prismTriangles(footprint, 0, heightMm) }
  } catch {
    return null
  }
}

/** 周辺建物の立体の並び。壊れた一棟は飛ばし、ほかは描く */
export function neighborMeshesOf(neighbors: readonly { footprint: readonly Point[]; heightMm: number }[]): VolumeMesh[] {
  return neighbors.flatMap((n) => {
    const m = neighborMeshOf(n.footprint, n.heightMm)
    return m ? [m] : []
  })
}
