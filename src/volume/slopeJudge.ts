// 斜線の適合判定（D-02 C5、A-03 G27・G28、D-03 T-03）。切る前と後の階ごとの面積を比べる。
import { polygonAreaMm2 } from '../geom/polygon'
import type { Point } from '../geom/viewport'
import { cutFloors, type SlopeBoundary } from './slope'

export function judgeSlope(
  footprint: readonly Point[],
  boundaries: readonly SlopeBoundary[],
  storeys: { storey_count: number; storey_height: number },
): '適合' | '超過' {
  const full = polygonAreaMm2(footprint)
  const cut = cutFloors(footprint, boundaries, storeys).map((f) => polygonAreaMm2(f))
  // 面積の誤差（丸め）を許す。どの階かで減っていれば超過
  return cut.every((a) => a >= full - Math.max(1, full * 1e-9)) ? '適合' : '超過'
}
