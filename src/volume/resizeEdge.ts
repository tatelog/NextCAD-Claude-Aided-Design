import type { Point } from '../geom/viewport'

/** 辺を法線方向に移動する。対辺は固定し、反転・自己交差を拒否する。 */
export function resizeEdge(points: readonly Point[], edge: number, delta: Point): Point[] | null {
  const n = points.length
  if (n < 3 || (!Number.isInteger(edge)) || edge < 0 || edge >= n || !Number.isFinite(delta.x + delta.y)) return null
  const a = points[edge], b = points[(edge + 1) % n]
  if (!a || !b) return null
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  if (length < 1) return null
  const nx = -(b.y - a.y) / length, ny = (b.x - a.x) / length
  const distance = delta.x * nx + delta.y * ny
  const next = points.map((p, i) => ({
    x: (p.x + (i === edge || i === (edge + 1) % n ? nx * distance : 0)) || 0,
    y: (p.y + (i === edge || i === (edge + 1) % n ? ny * distance : 0)) || 0,
  }))
  const cross = (a: Point, b: Point, c: Point) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
  const area = (ps: readonly Point[]) => ps.reduce((s,p,i) => s+p.x*ps[(i+1)%n]!.y-ps[(i+1)%n]!.x*p.y,0)
  if (area(points)*area(next) <= 0) return null
  for (let i=0;i<n;i++) {
    const a=next[i], b=next[(i+1)%n]
    if (!a || !b) return null
    if (Math.hypot(b.x-a.x,b.y-a.y)<1) return null
    for(let j=i+1;j<n;j++) {
      if(j===(i+1)%n || i===(j+1)%n) continue
      const c=next[j], d=next[(j+1)%n]
      if (!c || !d) return null
      if(cross(a,b,c)*cross(a,b,d)<=0 && cross(c,d,a)*cross(c,d,b)<=0 &&
        Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x)) &&
        Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y))<=Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y))) return null
    }
  }
  return next
}
