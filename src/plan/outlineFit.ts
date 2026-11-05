// P2 の外形から、自動作成に渡す幅・奥行き（mm）を取る（統括の依頼 2026-11-06。依頼 C）。決定論。
import type { Point } from '../geom/viewport'
import { outlineDimensions } from './outlineDimensions'

/** 閉じた矩形の外形なら、その幅・奥行き（整数の mm）。閉じていない・矩形でない・取れないときは null */
export function outlineFitOf(closed: boolean, footprint: readonly Point[] | null, axisToleranceDeg: number): { widthMm: number; depthMm: number } | null {
  if (!closed || footprint === null) return null
  const d = outlineDimensions(footprint, axisToleranceDeg)
  return d ? { widthMm: d.widthMm, depthMm: d.depthMm } : null
}
