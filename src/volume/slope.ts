// 斜線による段状の切り取り（D-02 C5、A-03 G27 B）。階の天端 z で、境界線から d ≥ (z − 立ち上がり) ÷ 係数 の範囲だけを残す。
// 法規の値（係数・立ち上がり）は呼び出し側が渡す（T-07 の値）。この関数には数値を書かない。
// 切り取りは半平面による Sutherland–Hodgman 法。決定論。座標は mm、交点は 1e-6 mm に丸める。
import { z } from 'zod'
import type { Point } from '../geom/viewport'

export interface SlopeBoundary {
  /** 境界線上の一点（mm） */
  point: Point
  /** 境界線から建物の内側へ向く単位法線 */
  inward: { x: number; y: number }
  /** 斜線の係数（例: 1.25）。0 より大きい */
  coefficient: number
  /** 立ち上がり（mm）。0 以上 */
  riseMm: number
  /** 距離の上限（mm）。道路斜線のように、境界からこの距離を超えれば制限しない（別表第三） */
  maxDistanceMm?: number
  /** どの斜線か（図書の判定を分けるため）。道路・北側・隣地 */
  kind?: 'road' | 'north' | 'adjacent'
}

const BoundarySchema = z.object({
  point: z.object({ x: z.number(), y: z.number() }),
  inward: z.object({ x: z.number(), y: z.number() }).refine((n) => Math.abs(Math.hypot(n.x, n.y) - 1) < 1e-9, {
    message: 'inward は単位法線',
  }),
  coefficient: z.number().positive(),
  riseMm: z.number().min(0),
  maxDistanceMm: z.number().positive().optional(),
  kind: z.enum(['road', 'north', 'adjacent']).optional(),
})

const round = (v: number) => Math.round(v * 1e6) / 1e6

// sign = 1 なら、境界から dist 以上の側（残す側）を残す。sign = −1 なら、dist より境界に近い側（切られる側）を残す（食い込みの部分）
function clipSide(poly: readonly Point[], b: SlopeBoundary, dist: number, sign: 1 | -1): Point[] {
  const f = (p: Point) => sign * (b.inward.x * (p.x - b.point.x) + b.inward.y * (p.y - b.point.y) - dist)
  const cut = (p: Point, q: Point, fp: number, fq: number): Point => {
    const t = fp / (fp - fq)
    return { x: round(p.x + t * (q.x - p.x)), y: round(p.y + t * (q.y - p.y)) }
  }
  const out: Point[] = []
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i]!
    const prev = poly[(i - 1 + poly.length) % poly.length]!
    const fc = f(cur)
    const fp = f(prev)
    if (fc >= 0) {
      if (fp < 0) out.push(cut(prev, cur, fp, fc))
      out.push(cur)
    } else if (fp >= 0) {
      out.push(cut(prev, cur, fp, fc))
    }
  }
  return out.length < 3 ? [] : out
}

function clipHalfPlane(poly: readonly Point[], b: SlopeBoundary, dist: number): Point[] {
  return clipSide(poly, b, dist, 1)
}

// 天端の高さ z（mm）での切り取り。すべての境界で順に切る。
export function cutFootprint(footprint: readonly Point[], boundaries: readonly SlopeBoundary[], topZMm: number): Point[] {
  let poly: Point[] = footprint.map((p) => ({ x: p.x, y: p.y }))
  for (const raw of boundaries) {
    const b = BoundarySchema.parse(raw)
    if (topZMm <= b.riseMm) continue
    const byHeight = (topZMm - b.riseMm) / b.coefficient
    const dist = b.maxDistanceMm === undefined ? byHeight : Math.min(b.maxDistanceMm, byHeight)
    poly = clipHalfPlane(poly, b, dist)
    if (poly.length === 0) return []
  }
  return poly
}

// 切り取られた部分（食い込み）。天端 z で、外形から切り取り後の形を引いた残り。境界ごとに、残りのうち切られる側を取る。取った部分どうしは重ならない（統括の指示 2026-11-06。5a）
export function removedPiecesOf(footprint: readonly Point[], boundaries: readonly SlopeBoundary[], topZMm: number): Point[][] {
  let remaining: Point[] = footprint.map((p) => ({ x: p.x, y: p.y }))
  const pieces: Point[][] = []
  for (const raw of boundaries) {
    const b = BoundarySchema.parse(raw)
    if (topZMm <= b.riseMm) continue
    const byHeight = (topZMm - b.riseMm) / b.coefficient
    const dist = b.maxDistanceMm === undefined ? byHeight : Math.min(b.maxDistanceMm, byHeight)
    const off = clipSide(remaining, b, dist, -1)
    if (off.length >= 3) pieces.push(off)
    remaining = clipSide(remaining, b, dist, 1)
    if (remaining.length === 0) break
  }
  return pieces
}

// 階ごとに切る。天端は (i + 1) × 階高。
export function cutFloors(
  footprint: readonly Point[],
  boundaries: readonly SlopeBoundary[],
  storeys: { storey_count: number; storey_height: number },
): Point[][] {
  return Array.from({ length: storeys.storey_count }, (_, i) =>
    cutFootprint(footprint, boundaries, (i + 1) * storeys.storey_height),
  )
}
