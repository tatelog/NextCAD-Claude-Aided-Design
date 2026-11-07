import { mmToPx, type Point, type Viewport } from '../geom/viewport'
import type { LotEdgeLabel } from '../plan/lot'

/** 番号の描画位置と同じ画面座標で判定する。 */
export function hitEdgeLabel(point: Point, labels: LotEdgeLabel[], viewport: Viewport): number | null {
  for (const label of labels) {
    const mid = mmToPx(viewport, label.mid)
    const x = mid.x + label.outward.x * 16
    const y = mid.y - label.outward.y * 16
    if (Math.hypot(point.x - x, point.y - y) <= 14) return label.index
  }
  return null
}
