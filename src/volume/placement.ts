// P2 ボリュームの配置（D-04 P2、A-03 G65・G67・G71）。
// 離れ（敷地境界から建物まで）、回転（建物の回転角）、つまみ（頂点を動かす）。いずれも mm、決定論。
import type { Point } from '../geom/viewport'

export interface Setback {
  north: number
  east: number
  south: number
  west: number
}

function isAxisRectangle(poly: readonly Point[]): boolean {
  if (poly.length !== 4) return false
  const xs = [...new Set(poly.map((p) => p.x))]
  const ys = [...new Set(poly.map((p) => p.y))]
  if (xs.length !== 2 || ys.length !== 2) return false
  // 4 点が 4 隅のすべてに一つずつ乗っている
  return xs.every((x) => ys.every((y) => poly.some((p) => p.x === x && p.y === y)))
}

// 敷地が軸に平行な矩形のときだけ離れを定義する。負の値は建物が敷地からはみ出していること。
export function setbackFromRectParcel(parcel: readonly Point[], building: readonly Point[]): Setback | null {
  if (!isAxisRectangle(parcel)) return null
  const pMinX = Math.min(...parcel.map((p) => p.x))
  const pMaxX = Math.max(...parcel.map((p) => p.x))
  const pMinY = Math.min(...parcel.map((p) => p.y))
  const pMaxY = Math.max(...parcel.map((p) => p.y))
  const bMinX = Math.min(...building.map((p) => p.x))
  const bMaxX = Math.max(...building.map((p) => p.x))
  const bMinY = Math.min(...building.map((p) => p.y))
  const bMaxY = Math.max(...building.map((p) => p.y))
  return {
    north: pMaxY - bMaxY,
    east: pMaxX - bMaxX,
    south: bMinY - pMinY,
    west: bMinX - pMinX,
  }
}

// 中心 pivot まわりに deg 度（反時計回り）回す。
export function rotateFootprint(poly: readonly Point[], pivot: Point, deg: number): Point[] {
  const rad = (deg * Math.PI) / 180
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  return poly.map((p) => {
    const x = p.x - pivot.x
    const y = p.y - pivot.y
    return { x: pivot.x + x * c - y * s, y: pivot.y + x * s + y * c }
  })
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

// 2 線分が（端点で触れる場合も含めて）交わるか
function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = cross(p3, p4, p1)
  const d2 = cross(p3, p4, p2)
  const d3 = cross(p1, p2, p3)
  const d4 = cross(p1, p2, p4)
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true
  const onSeg = (p: Point, a: Point, b: Point) =>
    Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x) && Math.min(a.y, b.y) <= p.y && p.y <= Math.max(a.y, b.y)
  if (d1 === 0 && onSeg(p1, p3, p4)) return true
  if (d2 === 0 && onSeg(p2, p3, p4)) return true
  if (d3 === 0 && onSeg(p3, p1, p2)) return true
  if (d4 === 0 && onSeg(p4, p1, p2)) return true
  return false
}

function isSimple(poly: readonly Point[]): boolean {
  const n = poly.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // 隣り合う辺は端点を共有するので除く
      if (j === i + 1 || (i === 0 && j === n - 1)) continue
      if (segmentsIntersect(poly[i]!, poly[(i + 1) % n]!, poly[j]!, poly[(j + 1) % n]!)) return false
    }
  }
  return true
}

// つまみで頂点 index を to へ動かす。結果が単純多角形でなければ弾く。
export function moveVertex(poly: readonly Point[], index: number, to: Point): Point[] {
  const next = poly.map((p, i) => (i === index ? { x: to.x, y: to.y } : { x: p.x, y: p.y }))
  if (!isSimple(next)) throw new Error('動かした結果が自己交差する')
  return next
}
