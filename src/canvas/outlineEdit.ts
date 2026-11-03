// 外形の編集を store の entries に確定する（ハブ A-03 G65 のつまみ）。描画にも状態にも依存しない純粋な処理。
// 線分は端点の ID で参照し合うが、座標（x1, y1, x2, y2）も持つ。端点だけ書き換えると線分の座標が食い違い、
// 閉じた外形（findClosedOutline は線分の座標から作る）が動かない。そこで端点と線分の座標を一緒に書き換える。
import type { Point } from '../geom/viewport'
import type { Node, Segment } from '../model/schema'

/** 端点と線分を持つ 1 単位（store の StrokeEntry など）。それ以外の項目は触らずに返す */
export interface OutlineEntry {
  readonly nodes: readonly Node[]
  readonly segments: readonly Segment[]
}

const keyOf = (x: number, y: number): string => `${x},${y}`

const isPoint = (v: unknown): v is Point =>
  typeof v === 'object' && v !== null && typeof (v as Point).x === 'number' && typeof (v as Point).y === 'number'

/**
 * 線分の座標と、曲線（spline）の制御点を、端点の動きに合わせて書き換える。
 * 制御点の両端は端点にそろえる。両端が同じだけ動いたとき（辺ごと動かしたとき）は、間の制御点も同じだけ動かす。
 */
function moveSegment(s: Segment, moves: ReadonlyMap<string, Point>): Segment {
  const p1 = moves.get(keyOf(s.x1, s.y1))
  const p2 = moves.get(keyOf(s.x2, s.y2))
  if (!p1 && !p2) return s

  const next: Segment = {
    ...s,
    x1: p1?.x ?? s.x1,
    y1: p1?.y ?? s.y1,
    x2: p2?.x ?? s.x2,
    y2: p2?.y ?? s.y2,
    revision: s.revision + 1,
  }

  const cps = s.curve === 'spline' ? s.curve_params?.control_points : undefined
  if (Array.isArray(cps) && cps.length >= 2 && cps.every(isPoint)) {
    const d1 = { x: next.x1 - s.x1, y: next.y1 - s.y1 }
    const d2 = { x: next.x2 - s.x2, y: next.y2 - s.y2 }
    const wholeEdgeMoved = d1.x === d2.x && d1.y === d2.y
    const last = cps.length - 1
    next.curve_params = {
      ...s.curve_params,
      control_points: cps.map((c, i) => {
        if (i === 0) return { x: next.x1, y: next.y1 }
        if (i === last) return { x: next.x2, y: next.y2 }
        return wholeEdgeMoved ? { x: c.x + d1.x, y: c.y + d1.y } : { x: c.x, y: c.y }
      }),
    }
  }
  return next
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
