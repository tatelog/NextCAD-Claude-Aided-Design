// 壁の 2D の輪郭（ハブ A-03 G4・D-02 C3「2D 図形の生成規則」）。壁は中心線から両側に壁厚の半分ずつ広げて描く。決定論。
// 角の切り取り（壁同士の取り合い）は、ここでは行わない（各壁の四角形を並べる。重なりは同じ色で塗るので見えにくい）。未了。
import type { Point } from '../geom/viewport'

/** 壁の線（中心線の両端と種類）。種類が wall の線だけを輪郭にする */
export interface WallLine {
  id: string
  a: Point
  b: Point
  kind: string | null
}

/** 中心線 a → b の両側に厚さの半分ずつ広げた四角形（4 点）。長さ 0 の線は空 */
export function wallRectOf(a: Point, b: Point, thicknessMm: number): Point[] {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len === 0) return []
  const h = thicknessMm / 2
  // 中心線に直角な単位ベクトル（左側）
  const nx = -dy / len
  const ny = dx / len
  return [
    { x: a.x + nx * h, y: a.y + ny * h },
    { x: b.x + nx * h, y: b.y + ny * h },
    { x: b.x - nx * h, y: b.y - ny * h },
    { x: a.x - nx * h, y: a.y - ny * h },
  ]
}

/** 種類が wall の線の輪郭（四角形の列） */
export function wallPolygonsOf(lines: readonly WallLine[], thicknessMm: number): Point[][] {
  return lines.filter((l) => l.kind === 'wall').map((l) => wallRectOf(l.a, l.b, thicknessMm)).filter((p) => p.length > 0)
}

const NODE_TOL_MM = 1
const near = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.y - q.y) <= NODE_TOL_MM

/**
 * 壁の輪郭（角の取り合い）。端点が、ほかの壁の端点と重なる（つながる）ところでは、壁を厚さの半分だけ伸ばして角を埋める。
 * 90 度の角では、外側の角が四角に埋まり、内側は重なって見えない。斜めの角や、中間に当たる T 字は、近似（伸ばす量は同じ）。
 */
export function wallPolygonsJoined(lines: readonly WallLine[], thicknessMm: number): Point[][] {
  const walls = lines.filter((l) => l.kind === 'wall' && (l.a.x !== l.b.x || l.a.y !== l.b.y))
  const h = thicknessMm / 2
  return walls.map((w, i) => {
    const others = walls.filter((_, j) => j !== i)
    const len = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y)
    const ux = (w.b.x - w.a.x) / len
    const uy = (w.b.y - w.a.y) / len
    const sharedA = others.some((o) => near(o.a, w.a) || near(o.b, w.a))
    const sharedB = others.some((o) => near(o.a, w.b) || near(o.b, w.b))
    const a = sharedA ? { x: w.a.x - ux * h, y: w.a.y - uy * h } : w.a
    const b = sharedB ? { x: w.b.x + ux * h, y: w.b.y + uy * h } : w.b
    return wallRectOf(a, b, thicknessMm)
  }).filter((p) => p.length > 0)
}
