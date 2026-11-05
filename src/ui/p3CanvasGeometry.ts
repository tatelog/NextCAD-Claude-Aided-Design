// P3 の描く画面（P3Canvas）の座標と、円弧の線の作り方（ハブ A-03 G152。統括の依頼 2026-11-05、t81）。
// 画面 1 px = 10 mm、原点は画面の中央、y は上向き（画面の y は下向き）。P2 の描く画面（DrawingCanvas）と同じ変換の式（geom/viewport）を使う。
import type { ArcResult } from '../input/arc'
import { mmToPx, pxToMm, type Point, type Viewport } from '../geom/viewport'
import type { Stroke } from '../model/schema'
import { p3Stroke } from '../plan/p3Stroke'

export const P3_W = 600
export const P3_H = 400
export const P3_MM_PER_PX = 10

/** P3 の描く画面の見え方（原点は中央、1 px = 10 mm） */
export const P3_VIEWPORT: Viewport = { originPx: { x: P3_W / 2, y: P3_H / 2 }, mmPerPx: P3_MM_PER_PX }

export function p3PxToMm(p: Point): Point {
  const mm = pxToMm(P3_VIEWPORT, p)
  // + 0 は -0 を 0 に揃える（中心の y が 0 のとき、負のゼロにならないように）
  return { x: mm.x + 0, y: mm.y + 0 }
}

export function p3MmToPx(p: Point): Point {
  return mmToPx(P3_VIEWPORT, p)
}

/**
 * 円弧（二点の円弧の道具の結果）を、P3 の描く画面の線にする。点は画面の座標で持つ。
 * 曲線モード（pen_mode: curve）で入れ、中心と向き（mm）を線に残す（G5）。
 */
export function p3ArcStroke(arc: ArcResult, id: string): Stroke {
  const stroke = p3Stroke({
    points: arc.points.map((q) => {
      const px = p3MmToPx(q)
      return { px: px.x, py: px.y }
    }),
    viewScaleMmPerPx: P3_MM_PER_PX,
    viewOriginPx: { px: P3_VIEWPORT.originPx.x, py: P3_VIEWPORT.originPx.y },
    id,
  })
  return { ...stroke, pen_mode: 'curve', arc: { center: { x: arc.center.x, y: arc.center.y }, ccw: arc.ccw } }
}
