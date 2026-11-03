// 前面道路の幅員（D-02 C4、D-03 T-02 敷地 front_roads、A-03 G16）。
// 3 方式: 数値指定／対岸指定（地図の筆界から測る）／資料指定。測った値は採用幅員にしない（採用は adoptWidth で明示する）。
import { z } from 'zod'
import type { Point } from '../geom/viewport'

export interface Segment {
  a: Point
  b: Point
}

// 反時計回りの多角形の辺 i の外向き法線（単位ベクトル）。時計回りなら向きを反転して揃える。
export function outwardNormal(polygon: readonly Point[], i: number): { x: number; y: number } {
  let twiceArea = 0
  for (let k = 0; k < polygon.length; k++) {
    const p = polygon[k]!
    const q = polygon[(k + 1) % polygon.length]!
    twiceArea += p.x * q.y - q.x * p.y
  }
  const a = polygon[i]!
  const b = polygon[(i + 1) % polygon.length]!
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  const sign = twiceArea >= 0 ? 1 : -1
  // 反時計回りでは (dy, −dx) が外向き
  return { x: (sign * dy) / len, y: (sign * -dx) / len }
}

export interface WidthSample {
  t: number
  width_mm: number | null
  status: 'ok' | '算出不能'
}

export interface OppositeWidthResult {
  method: '対岸指定'
  samples: WidthSample[]
  adopted_width_mm: null
  adopted_reason: null
}

const EPS = 1e-9

// 辺の位置 t（0〜1）ごとに、外向きの半直線を引き、向かいの筆界（線分）との最も近い交点までの距離を測る。
export function measureOppositeWidth(
  polygon: readonly Point[],
  edgeIndex: number,
  opposite: readonly Segment[],
  positions: readonly number[],
): OppositeWidthResult {
  const a = polygon[edgeIndex]!
  const b = polygon[(edgeIndex + 1) % polygon.length]!
  const n = outwardNormal(polygon, edgeIndex)
  const samples: WidthSample[] = positions.map((t) => {
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    let best: number | null = null
    for (const seg of opposite) {
      const e = { x: seg.b.x - seg.a.x, y: seg.b.y - seg.a.y }
      const cross = (u: { x: number; y: number }, v: { x: number; y: number }) => u.x * v.y - u.y * v.x
      const cp = { x: seg.a.x - p.x, y: seg.a.y - p.y }
      const denom = cross(n, e)
      if (Math.abs(denom) < EPS) continue
      const s = cross(cp, e) / denom
      const u = cross(cp, n) / denom
      if (s > EPS && u >= -EPS && u <= 1 + EPS && (best === null || s < best)) best = s
    }
    return best === null ? { t, width_mm: null, status: '算出不能' } : { t, width_mm: Math.round(best), status: 'ok' }
  })
  return { method: '対岸指定', samples, adopted_width_mm: null, adopted_reason: null }
}

export function specifiedWidth(widthMm: number) {
  const v = z.number().positive().parse(widthMm)
  return { method: '数値指定' as const, width_mm: v, source: '利用者入力' as const }
}

const ResourceSchema = z
  .object({
    value_mm: z.number().positive(),
    min_mm: z.number().positive(),
    max_mm: z.number().positive(),
    source: z.string().min(1),
  })
  .refine((r) => r.min_mm <= r.max_mm, { message: '範囲の最小が最大より大きい' })

export function resourceWidth(input: z.input<typeof ResourceSchema>) {
  const r = ResourceSchema.parse(input)
  return { method: '資料指定' as const, width_mm: r.value_mm, min_mm: r.min_mm, max_mm: r.max_mm, source: r.source }
}

// 採用幅員は、採用理由と一緒に明示的に入れたときだけ決まる（地図から測った値を自動で採用しない。G16）。
export function adoptWidth(widthMm: number, reason: string) {
  const r = z.object({ width: z.number().positive(), reason: z.string().trim().min(1) }).parse({ width: widthMm, reason })
  return { adopted_width_mm: r.width, adopted_reason: r.reason }
}
