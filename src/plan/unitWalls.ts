// 住戸の壁と開口を数える（ハブ A-03 G76「壁・開口」）。描いた線の中点を、区画に当てて数える。決定論。
// 種類（壁・開口）は、意味づけ（人が選んだ・Claude の提案）の結果。種類の無い線は数えない。
import type { Rect } from './candidateCells'

/** 描いた線 1 本の中点と、その線の種類（意味づけの結果。無ければ null） */
export interface KindPoint {
  x: number
  y: number
  kind: string | null
}

/** 辺の上の中点も区画の中とみなす誤差（mm） */
const EDGE_TOLERANCE_MM = 1

/** 区画の中（辺の上を含む）にある中点の、壁と開口の数 */
export function kindCountsIn(cell: Rect, points: readonly KindPoint[]): { walls: number; openings: number } {
  const inside = (p: KindPoint) =>
    p.x >= cell.x0 - EDGE_TOLERANCE_MM && p.x <= cell.x1 + EDGE_TOLERANCE_MM && p.y >= cell.y0 - EDGE_TOLERANCE_MM && p.y <= cell.y1 + EDGE_TOLERANCE_MM
  const here = points.filter(inside)
  return {
    walls: here.filter((p) => p.kind === 'wall').length,
    openings: here.filter((p) => p.kind === 'opening').length,
  }
}
