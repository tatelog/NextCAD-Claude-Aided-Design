// 描く画面の初めの表示: 敷地の外接矩形を、画面の中に収める原点と倍率（統括の依頼 2026-11-06。1 件目）。
// 倍率と原点の決め方は、ダミー（20 m × 30 m）のときの従来の初期表示と同じ（画面の幅の 60%・高さの 80% に収め、中心を画面の中心に置く）。
// mm の +y は画面の上向き（mmToPx と同じ）。決定論。
import type { Point } from '../geom/viewport'
import { lotOf } from './lot'

export interface ViewFit {
  readonly originPx: Point
  readonly mmPerPx: number
}

const FILL_WIDTH = 0.6
const FILL_HEIGHT = 0.8

interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function boxOf(points: readonly Point[]): Box {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
}

function fitBox(box: Box, widthPx: number, heightPx: number): ViewFit {
  const mmPerPx = Math.max((box.maxX - box.minX) / (widthPx * FILL_WIDTH), (box.maxY - box.minY) / (heightPx * FILL_HEIGHT))
  const cx = (box.minX + box.maxX) / 2
  const cy = (box.minY + box.maxY) / 2
  return { originPx: { x: widthPx / 2 - cx / mmPerPx, y: heightPx / 2 + cy / mmPerPx }, mmPerPx }
}

/** 敷地の外接矩形を画面（幅・高さ px）に収める。外接矩形の大きさが 0 の敷地は、ダミーに合わせる */
export function viewOfLot(lot: readonly Point[], widthPx: number, heightPx: number): ViewFit {
  const box = boxOf(lot)
  const hasSize = box.maxX - box.minX > 0 || box.maxY - box.minY > 0
  return fitBox(hasSize ? box : boxOf(lotOf(null)), widthPx, heightPx)
}
