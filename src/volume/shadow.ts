// 日影の形（D-04 P2、A-03 G54）。太陽の高さと方位から、建物の影（地面に落ちる形）を作る。決定論。
// 方位は南を 0°・西回り。高さ z の点は、太陽の反対側へ z × cot(高さ) だけずれた地面に落ちる。
import type { Point } from '../geom/viewport'

export function polygonArea(poly: readonly Point[]): number {
  let s = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    s += a.x * b.y - b.x * a.y
  }
  return Math.abs(s) / 2
}

// 凸包（Andrew の単調チェーン）。建物の影は、底面と上面の影の凸包として近似する
function convexHull(points: readonly Point[]): Point[] {
  const pts = [...points].sort((p, q) => p.x - q.x || p.y - q.y)
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lower: Point[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Point[] = []
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop()
    upper.push(p)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

export function shadowOf(footprint: readonly Point[], heightMm: number, altitudeDeg: number, azimuthFromSouthDeg: number): Point[] {
  const alt = (altitudeDeg * Math.PI) / 180
  const az = (azimuthFromSouthDeg * Math.PI) / 180
  // 太陽の反対側（北・東）へ、高さ 1 あたり cot(高さ) だけずれる
  const k = Math.cos(alt) / Math.sin(alt)
  const dx = Math.sin(az) * k
  const dy = Math.cos(az) * k
  const top = footprint.map((p) => ({ x: p.x + heightMm * dx, y: p.y + heightMm * dy }))
  return convexHull([...footprint.map((p) => ({ x: p.x, y: p.y })), ...top])
}
