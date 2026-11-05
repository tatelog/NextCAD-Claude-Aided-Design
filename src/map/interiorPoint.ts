// 筆の中の点（統括の依頼 2026-11-06。1）。確定の地点に使う（246e753 の DEMO_SITE と同じ考え）。
// 重心が筆の中に入るときは重心。外に出るとき（L 字など）は、筆の中で辺から一番離れた点を、格子で探す。決定論。
import { outerLonLatOf } from './parcelPlane'

type LL = [number, number]

/** 点が輪の中にあるか（レイキャスト） */
function ringContains(p: LL, ring: LL[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!
    const [xj, yj] = ring[j]!
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** 点から輪の辺までの距離（経度は緯度の cos で縮める。単位は度の近似） */
function edgeDistanceOf(p: LL, ring: LL[]): number {
  const k = Math.cos((p[1] * Math.PI) / 180)
  let best = Infinity
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!
    const b = ring[(i + 1) % ring.length]!
    const ax = a[0] * k
    const ay = a[1]
    const bx = b[0] * k
    const by = b[1]
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] * k - ax) * dx + (p[1] - ay) * dy) / len2))
    best = Math.min(best, Math.hypot(p[0] * k - (ax + t * dx), p[1] - (ay + t * dy)))
  }
  return best
}

const round6 = (v: number) => Math.round(v * 1e6) / 1e6

/** 筆の中の点（経緯度）。筆の図形が取れないときは null */
export function interiorPointOf(geometry: unknown): { lon: number; lat: number } | null {
  const ring = outerLonLatOf(geometry)
  if (ring === null) return null
  // 面積の重心（経緯度）
  let a2 = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i]!
    const [x1, y1] = ring[(i + 1) % ring.length]!
    const cr = x0 * y1 - x1 * y0
    a2 += cr
    cx += (x0 + x1) * cr
    cy += (y0 + y1) * cr
  }
  if (a2 !== 0) {
    const c: LL = [cx / (3 * a2), cy / (3 * a2)]
    if (ringContains(c, ring)) return { lon: round6(c[0]), lat: round6(c[1]) }
  }
  // 重心が外に出るとき: 格子の中で、筆の中の点のうち辺から一番離れた点
  const xs = ring.map((p) => p[0])
  const ys = ring.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const N = 80
  let best: { p: LL; d: number } | null = null
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const p: LL = [minX + ((maxX - minX) * (i + 0.5)) / N, minY + ((maxY - minY) * (j + 0.5)) / N]
      if (!ringContains(p, ring)) continue
      const d = edgeDistanceOf(p, ring)
      if (best === null || d > best.d) best = { p, d }
    }
  }
  return best === null ? null : { lon: round6(best.p[0]), lat: round6(best.p[1]) }
}
