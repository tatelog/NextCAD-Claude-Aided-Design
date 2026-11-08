// P2 の外形から、自動作成に渡す幅・奥行き（mm）を取る（統括の依頼 2026-11-06。依頼 C）。決定論。
import type { Point } from '../geom/viewport'
import { outlineDimensions } from './outlineDimensions'

/** 閉じた矩形の外形なら、その幅・奥行き（整数の mm）。閉じていない・矩形でない・取れないときは null */
export function outlineFitOf(closed: boolean, footprint: readonly Point[] | null, axisToleranceDeg: number): { widthMm: number; depthMm: number } | null {
  if (!closed || footprint === null) return null
  const d = outlineDimensions(footprint, axisToleranceDeg)
  return d ? { widthMm: d.widthMm, depthMm: d.depthMm } : null
}

/** 目標の戸数と、外形に入る数（M）の比べ方の文言。寸法は変えない（統括の依頼 2026-11-06。依頼 C） */
export function outlineFitTextOf(target: number, fits: number): string {
  const head = `目標 ${target} 戸に対し、外形に入るのは ${fits} 戸`
  if (fits < target) return `${head}。入らない（入るのは ${fits} 戸）`
  if (fits > target) return `${head}。目標より多く入る（${fits} 戸）`
  return `${head}。目標どおり`
}
