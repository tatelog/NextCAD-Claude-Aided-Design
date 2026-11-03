// 曲線を含む外形（D-02 C5・C9、A-03 G3・G7）。外形は線分と円弧の閉じた列。
// 円弧は中心・始点・終点・向き（ccw）で持ち、必要なときだけ弦の誤差以内の折れ線に直す（IFC2X3 は折れ線）。
import type { Point } from '../geom/viewport'

export type CurveEdge =
  | { kind: 'line'; a: Point; b: Point }
  | { kind: 'arc'; a: Point; b: Point; center: Point; ccw: boolean }

const TOL_MM = 1

const dist = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.y - q.y)

export function validateLoop(loop: readonly CurveEdge[]): void {
  // 直線だけなら 3 本以上。円弧を含めば 2 本で閉じられる（半円と直線など）
  const hasArc = loop.some((e) => e.kind === 'arc')
  if (loop.length < 2 || (!hasArc && loop.length < 3)) throw new Error('外形は閉じるのに辺が足りない')
  for (let i = 0; i < loop.length; i++) {
    const e = loop[i]!
    const next = loop[(i + 1) % loop.length]!
    if (dist(e.b, next.a) > TOL_MM) throw new Error(`辺 ${i} と辺 ${(i + 1) % loop.length} がつながらない`)
    if (e.kind === 'arc') {
      const ra = dist(e.a, e.center)
      const rb = dist(e.b, e.center)
      if (Math.abs(ra - rb) > TOL_MM) throw new Error(`辺 ${i} の円弧の始点と終点の半径が違う`)
    }
  }
}

export function arcToPolyline(arc: Extract<CurveEdge, { kind: 'arc' }>, maxErrorMm: number): Point[] {
  const r = dist(arc.a, arc.center)
  const ta = Math.atan2(arc.a.y - arc.center.y, arc.a.x - arc.center.x)
  const tb = Math.atan2(arc.b.y - arc.center.y, arc.b.x - arc.center.x)
  const TWO_PI = 2 * Math.PI
  let sweep = (tb - ta) % TWO_PI
  if (arc.ccw && sweep <= 0) sweep += TWO_PI
  if (!arc.ccw && sweep >= 0) sweep -= TWO_PI
  // 弦の誤差 r(1 − cos(φ/2)) ≤ maxErrorMm になるような一区間の角度 φ
  const phi = 2 * Math.acos(Math.max(-1, 1 - maxErrorMm / r))
  const n = Math.max(1, Math.ceil(Math.abs(sweep) / phi))
  const pts: Point[] = [{ x: arc.a.x, y: arc.a.y }]
  for (let k = 1; k < n; k++) {
    const t = ta + (sweep * k) / n
    pts.push({ x: arc.center.x + r * Math.cos(t), y: arc.center.y + r * Math.sin(t) })
  }
  pts.push({ x: arc.b.x, y: arc.b.y })
  return pts
}

// 外形を、辺の始点の列（閉じた多角形）に直す。円弧は弦の誤差以内の折れ線。
export function loopToPolygon(loop: readonly CurveEdge[], maxErrorMm: number): Point[] {
  validateLoop(loop)
  const out: Point[] = []
  for (const e of loop) {
    if (e.kind === 'line') out.push({ x: e.a.x, y: e.a.y })
    else out.push(...arcToPolyline(e, maxErrorMm).slice(0, -1))
  }
  return out
}
