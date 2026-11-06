// 斜線の面と食い込み（統括の指示 2026-11-06。5a）。境界（legalBoundaries の結果）から、3D に出す面と、切られた部分を作る。決定論。
// 上限の高さ: 境界からの内側への距離 d で rise + coef × d。距離の上限（道路斜線の D）以上は制限しない（slope.ts の切り取りと同じ定義）。
import type { Point } from '../geom/viewport'
import { removedPiecesOf, type SlopeBoundary } from './slope'

/** 境界からの距離 d（mm）での、上限の高さ（mm）。距離の上限以上は無限（制限しない） */
export function slopeLimitMm(b: SlopeBoundary, d: number): number {
  if (b.maxDistanceMm !== undefined && d >= b.maxDistanceMm) return Infinity
  return b.riseMm + b.coefficient * d
}

/** 斜線の面の頂点（平面の mm と高さ mm） */
export interface SlopeVertex {
  x: number
  y: number
  hMm: number
}

/**
 * 斜線の面（境界ごとの傾いた四角形）。境界の線に沿って ±extentMm、内側へ距離 D（距離の上限と extentMm の小さい方）。
 * 高さは、境界の線上で rise、距離 D で rise + coef × D。四隅の順は、西の端（低い側）・東の端（低い側）・東の端（高い側）・西の端（高い側）。
 */
export function slopeSheetsOf(boundaries: readonly SlopeBoundary[], extentMm: number, heightCapMm?: number): SlopeVertex[][] {
  return boundaries.flatMap((b) => {
    let depth = b.maxDistanceMm === undefined ? extentMm : Math.min(b.maxDistanceMm, extentMm)
    // 建物の高さに届く距離までで切る（それより先は、建物に届かないので描かない）。統括の依頼 2026-11-06
    if (heightCapMm !== undefined) depth = Math.min(depth, (heightCapMm - b.riseMm) / b.coefficient)
    if (!(depth > 0)) return []
    const t = { x: -b.inward.y, y: b.inward.x }
    const at = (s: number, d: number, h: number): SlopeVertex => ({
      x: b.point.x + t.x * s + b.inward.x * d,
      y: b.point.y + t.y * s + b.inward.y * d,
      hMm: h,
    })
    const low = b.riseMm
    const high = b.riseMm + b.coefficient * depth
    return [[at(-extentMm, 0, low), at(extentMm, 0, low), at(extentMm, depth, high), at(-extentMm, depth, high)]]
  })
}

/** 階ごとの食い込み。階の基準の高さ〜天端の範囲に、その天端で切られた部分（平面の多角形）を置く */
export interface OverrunFloor {
  baseMm: number
  topMm: number
  pieces: Point[][]
}

export function overrunFloorsOf(
  footprint: readonly Point[],
  boundaries: readonly SlopeBoundary[],
  storeys: { storey_count: number; storey_height: number },
): OverrunFloor[] {
  return Array.from({ length: storeys.storey_count }, (_, i) => ({
    baseMm: i * storeys.storey_height,
    topMm: (i + 1) * storeys.storey_height,
    pieces: removedPiecesOf(footprint, boundaries, (i + 1) * storeys.storey_height),
  }))
}
