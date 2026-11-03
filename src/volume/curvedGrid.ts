// 曲線外形に沿う外周の通り芯（ハブ A-03 G5・D-02 C6）。円弧の外形に対して、外周の通り芯は同心の円弧、直線の通りは円弧と交わる所で止まる。決定論。
import type { Point } from '../geom/viewport'
import type { CurveEdge } from './curvedFootprint'

type Arc = Extract<CurveEdge, { kind: 'arc' }>

const TAU = 2 * Math.PI

// 角度を [0, 2π) に直す
const norm = (x: number) => ((x % TAU) + TAU) % TAU
const angleOf = (c: Point, p: Point) => Math.atan2(p.y - c.y, p.x - c.x)

// 円弧の範囲（ccw なら a から反時計回りに b まで）に、点 p の角度があるか
function inSweep(arc: Arc, p: Point): boolean {
  const start = angleOf(arc.center, arc.a)
  const end = angleOf(arc.center, arc.b)
  const at = angleOf(arc.center, p)
  const span = arc.ccw ? norm(end - start) : norm(start - end)
  const delta = arc.ccw ? norm(at - start) : norm(start - at)
  const eps = 1e-9
  return delta <= span + eps
}

/** 外周の通り芯の円弧: 同じ中心・向きで、半径を insetMm だけ内側へずらし、同じ角度の範囲を持つ */
export function perimeterArc(arc: Arc, insetMm: number): Arc {
  const r = Math.hypot(arc.a.x - arc.center.x, arc.a.y - arc.center.y)
  const k = (r - insetMm) / r
  const onInner = (p: Point): Point => ({ x: arc.center.x + (p.x - arc.center.x) * k, y: arc.center.y + (p.y - arc.center.y) * k })
  return { kind: 'arc', a: onInner(arc.a), b: onInner(arc.b), center: { ...arc.center }, ccw: arc.ccw }
}

/** 直線の通り（x または y が一定）が円弧と交わる点。円弧の範囲の内の点だけ */
export function straightGridMeetsArc(arc: Arc, axis: 'x' | 'y', coord: number): Point[] {
  const c = arc.center
  const r = Math.hypot(arc.a.x - c.x, arc.a.y - c.y)
  const offset = axis === 'x' ? coord - c.x : coord - c.y
  const rest2 = r * r - offset * offset
  if (rest2 < 0) return []
  const rest = Math.sqrt(rest2)
  const candidates: Point[] = axis === 'x'
    ? [
        { x: coord, y: c.y + rest },
        { x: coord, y: c.y - rest },
      ]
    : [
        { x: c.x + rest, y: coord },
        { x: c.x - rest, y: coord },
      ]
  // 両方が同じ点（接する）のときは 1 つだけ
  const unique = rest === 0 ? candidates.slice(0, 1) : candidates
  return unique.filter((p) => inSweep(arc, p))
}
