// 外形の編集を store の entries に確定する（ハブ A-03 G65 のつまみ、G71 の回転）。描画にも状態にも依存しない純粋な処理。
// 線分は端点の ID で参照し合うが、座標（x1, y1, x2, y2）も持つ。端点だけ書き換えると線分の座標が食い違い、
// 閉じた外形（findClosedOutline は線分の座標から作る）が動かない。そこで端点と線分の座標を一緒に書き換える。
import type { Point } from '../geom/viewport'
import type { Node, Segment } from '../model/schema'
import { rotateFootprint } from '../volume/placement'
import { outlineCentroid } from '../volume/rotation'
import { findClosedOutline } from './closure'
import { arcParamsFromNodes, arcParamsOf } from './arcSegment'

/** 端点と線分を持つ 1 単位（store の StrokeEntry など）。それ以外の項目は触らずに返す */
export interface OutlineEntry {
  readonly nodes: readonly Node[]
  readonly segments: readonly Segment[]
}

const keyOf = (x: number, y: number): string => `${x},${y}`

const isPoint = (v: unknown): v is Point =>
  typeof v === 'object' && v !== null && typeof (v as Point).x === 'number' && typeof (v as Point).y === 'number'

/** 曲線（spline）の制御点。無い・形が違うときは null */
function controlPointsOf(s: Segment): Point[] | null {
  const cps = s.curve === 'spline' ? s.curve_params?.control_points : undefined
  return Array.isArray(cps) && cps.length >= 2 && cps.every(isPoint) ? cps : null
}

/**
 * 線分の端を p1・p2 に置き直し、revision を 1 進める。曲線（spline）は制御点の両端を端点にそろえ、
 * 間の制御点は interior で動かす。
 */
function reshapeSegment(s: Segment, p1: Point, p2: Point, interior: (c: Point) => Point, centerOf: (c: Point) => Point = (c) => c): Segment {
  const next: Segment = { ...s, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, revision: s.revision + 1 }
  const cps = controlPointsOf(s)
  if (cps) {
    const last = cps.length - 1
    next.curve_params = {
      ...s.curve_params,
      control_points: cps.map((c, i) => (i === 0 ? { x: p1.x, y: p1.y } : i === last ? { x: p2.x, y: p2.y } : interior(c))),
    }
  }
  // 円弧は、中心を centerOf で動かし、半径と始終角を新しい端点から決め直す（t82）
  const arc = arcParamsOf(s)
  if (arc) next.curve_params = arcParamsFromNodes(centerOf(arc.center), p1, p2, arc.ccw)
  return next
}

/** 線分の座標と制御点が同じか（revision は見ない） */
function sameGeometry(a: Segment, b: Segment): boolean {
  if (a.x1 !== b.x1 || a.y1 !== b.y1 || a.x2 !== b.x2 || a.y2 !== b.y2) return false
  if (arcParamsOf(a) || arcParamsOf(b)) return JSON.stringify(a.curve_params) === JSON.stringify(b.curve_params)
  const ca = controlPointsOf(a)
  const cb = controlPointsOf(b)
  if (!ca || !cb) return ca === cb
  return ca.length === cb.length && ca.every((c, i) => c.x === cb[i]!.x && c.y === cb[i]!.y)
}

/**
 * 端点が動いた線分。両端が同じだけ動いたとき（辺ごと動かしたとき）は、間の制御点も同じだけ動かす。
 */
function moveSegment(s: Segment, moves: ReadonlyMap<string, Point>): Segment {
  const m1 = moves.get(keyOf(s.x1, s.y1))
  const m2 = moves.get(keyOf(s.x2, s.y2))
  if (!m1 && !m2) return s
  const p1 = m1 ?? { x: s.x1, y: s.y1 }
  const p2 = m2 ?? { x: s.x2, y: s.y2 }
  const d1 = { x: p1.x - s.x1, y: p1.y - s.y1 }
  const d2 = { x: p2.x - s.x2, y: p2.y - s.y2 }
  const wholeEdgeMoved = d1.x === d2.x && d1.y === d2.y
  // 辺ごと動かしたときは、円弧の中心も同じだけ動く。端点だけ動かしたときは中心は動かない
  const shift = (c: Point): Point => (wholeEdgeMoved ? { x: c.x + d1.x, y: c.y + d1.y } : { x: c.x, y: c.y })
  return reshapeSegment(s, p1, p2, shift, shift)
}

/**
 * 外形の頂点を from から to へ動かした entries を返す（入力は書き換えない）。
 * from・to は同じ頂点数の同じ並び。座標が変わった頂点にある端点と、その端点につながる線分の端だけが変わる。
 * 動かす先が別の頂点の元の位置と重なっても連鎖しないよう、元の座標から一度に置き換える。
 * 頂点数が違う、または動いていないときは何も変えない。
 */
export function moveOutlineVertices<E extends OutlineEntry>(entries: readonly E[], from: readonly Point[], to: readonly Point[]): E[] {
  if (from.length !== to.length) return [...entries]

  const moves = new Map<string, Point>()
  from.forEach((p, i) => {
    const q = to[i]!
    if (p.x !== q.x || p.y !== q.y) moves.set(keyOf(p.x, p.y), { x: q.x, y: q.y })
  })
  if (moves.size === 0) return [...entries]

  return entries.map((e) => ({
    ...e,
    nodes: e.nodes.map((n) => {
      const m = moves.get(keyOf(n.x, n.y))
      return m ? { ...n, x: m.x, y: m.y } : n
    }),
    segments: e.segments.map((s) => moveSegment(s, moves)),
  }))
}

/**
 * 外形を重心のまわりに deg 度（反時計回り。mm の +y が画面の上）回した entries を返す（入力は書き換えない）。
 * 端点・線分の座標・曲線の制御点をすべて同じ回転で動かし、座標は整数 mm に丸める。
 * 外形が閉じていない（重心を決める外形が無い）ときと、座標が変わらないとき（0°・360°）は何も変えない。
 */
export function rotateOutline<E extends OutlineEntry>(entries: readonly E[], deg: number): E[] {
  const closure = findClosedOutline(entries.flatMap((e) => e.segments))
  if (!closure.closed) return [...entries]
  const pivot = outlineCentroid(closure.footprint)
  if (!pivot) return [...entries]

  const rotate = (p: Point): Point => {
    const q = rotateFootprint([p], pivot, deg)[0]!
    return { x: Math.round(q.x) + 0, y: Math.round(q.y) + 0 }
  }
  // 円弧の中心は、丸めずに回す（半径を保つため）
  const rotateExact = (p: Point): Point => rotateFootprint([p], pivot, deg)[0]!

  return entries.map((e) => ({
    ...e,
    nodes: e.nodes.map((n) => {
      const q = rotate(n)
      return q.x === n.x && q.y === n.y ? n : { ...n, x: q.x, y: q.y }
    }),
    segments: e.segments.map((s) => {
      const next = reshapeSegment(s, rotate({ x: s.x1, y: s.y1 }), rotate({ x: s.x2, y: s.y2 }), rotate, rotateExact)
      return sameGeometry(s, next) ? s : next
    }),
  }))
}
