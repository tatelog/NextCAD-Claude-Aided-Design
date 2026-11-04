// Ramer–Douglas–Peucker 法。直線モードの折れ線を簡略化する（D-02 C1、許容 8 px は仮置き）。
import type { Point } from './viewport'

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  const px = a.x + t * dx
  const py = a.y + t * dy
  return Math.hypot(p.x - px, p.y - py)
}

export function simplifyRdp(points: readonly Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points.map((p) => ({ x: p.x, y: p.y }))
  const first = points[0]!
  const last = points[points.length - 1]!
  let maxDist = -1
  let index = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i]!, first, last)
    if (d > maxDist) {
      maxDist = d
      index = i
    }
  }
  if (maxDist <= tolerance) return [{ x: first.x, y: first.y }, { x: last.x, y: last.y }]
  const left = simplifyRdp(points.slice(0, index + 1), tolerance)
  const right = simplifyRdp(points.slice(index), tolerance)
  return [...left.slice(0, -1), ...right]
}
