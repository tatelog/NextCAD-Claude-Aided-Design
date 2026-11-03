// 入力スナップ（D-02 C1「スナップ先と優先順」「吸着半径」）。
// 優先順: ①既存の端点 ②既存の線分の交点 ③既存の線分上（垂線の足） ④水平・垂直（直前の頂点から ±3 度）
//         ⑤入力スナップのグリッド交点。どれにも当たらなければ座標は変えない。
// 表示グリッドとは別の設定。ここは「入力スナップのグリッド」だけを見る（gridMm が null なら無効）。
import type { Node, Segment, Snap } from '../model/schema'

/** 吸着半径（画面 px）。仮置き 24 */
export const SNAP_RADIUS_PX = 24

/** 画面 px の吸着半径を、見ている倍率で mm に換算する */
export const snapRadiusMm = (mmPerPx: number): number => SNAP_RADIUS_PX * mmPerPx

export interface SnapContext {
  /** 既存の端点 */
  nodes: readonly Node[]
  /** 既存の線分（交点・線分上に使う） */
  segments: readonly Segment[]
  /** 直前の頂点（水平・垂直に使う）。無ければ null */
  prev: Node | null
  /** 吸着半径（mm） */
  radiusMm: number
  /** 水平・垂直に揃える角度（度）。仮置き 3 */
  axisDeg: number
  /** 入力スナップのグリッド間隔（mm）。null なら使わない */
  gridMm: number | null
}

export interface SnapResult {
  x: number
  y: number
  snap: Snap
  /** 端点に吸着したときだけ、その端点の ID（端点の共有） */
  nodeId: string | null
}

interface Pt {
  x: number
  y: number
}

const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y)

/** 吸着の対象になる直線の区間（mm）。曲線は制御点を結ぶ折れ線の区間に分ける */
interface Chord {
  x1: number
  y1: number
  x2: number
  y2: number
}

/** 曲線（spline）は弦ではなく制御点の折れ線で吸着する。直線はそのまま 1 区間 */
function chordsOf(segments: readonly Segment[]): Chord[] {
  const out: Chord[] = []
  for (const s of segments) {
    const cps = s.curve === 'spline' ? (s.curve_params?.control_points as Pt[] | undefined) : undefined
    if (cps && cps.length >= 2) {
      for (let i = 0; i < cps.length - 1; i++) {
        out.push({ x1: cps[i]!.x, y1: cps[i]!.y, x2: cps[i + 1]!.x, y2: cps[i + 1]!.y })
      }
    } else {
      out.push({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })
    }
  }
  return out
}

/** 半径内で最も近い端点。無ければ null */
function nearestNode(nodes: readonly Node[], p: Pt, radius: number): Node | null {
  let best: Node | null = null
  let bestD = radius
  for (const n of nodes) {
    const d = dist(n, p)
    if (d <= bestD) {
      bestD = d
      best = n
    }
  }
  return best
}

/** 実寸 mm の整数に丸める（Segment と Node の座標は整数 mm） */
const toMmInt = (p: Pt): Pt => ({ x: Math.round(p.x), y: Math.round(p.y) })

export function snapPoint(p: Pt, ctx: SnapContext): SnapResult {
  // ① 既存の端点（最も近いもの）
  const node = nearestNode(ctx.nodes, p, ctx.radiusMm)
  if (node) return { x: node.x, y: node.y, snap: 'node', nodeId: node.id }

  // ② 既存の線分どうしの交点（両方の線分の内側・端に当たるもの）
  const ix = nearestIntersection(p, chordsOf(ctx.segments), ctx.radiusMm)
  if (ix) return { ...toMmInt(ix), snap: 'intersection', nodeId: null }

  // ③ 既存の線分上の垂線の足（線分の内側に落ちるもの）
  const on = nearestOnSegment(p, chordsOf(ctx.segments), ctx.radiusMm)
  if (on) return { ...toMmInt(on), snap: 'on_segment', nodeId: null }

  // ④ 水平・垂直（直前の頂点から見て、軸に ±axisDeg 以内）。揃えた後の点で端点をもう一度照合する
  if (ctx.prev) {
    const tan = Math.tan((ctx.axisDeg * Math.PI) / 180)
    const dx = p.x - ctx.prev.x
    const dy = p.y - ctx.prev.y
    let axisPt: Pt | null = null
    if (dx !== 0 && Math.abs(dy) <= Math.abs(dx) * tan) axisPt = { x: p.x, y: ctx.prev.y }
    else if (dy !== 0 && Math.abs(dx) <= Math.abs(dy) * tan) axisPt = { x: ctx.prev.x, y: p.y }
    if (axisPt) {
      const again = nearestNode(ctx.nodes, axisPt, ctx.radiusMm)
      if (again) return { x: again.x, y: again.y, snap: 'node', nodeId: again.id }
      return { x: axisPt.x, y: axisPt.y, snap: 'axis', nodeId: null }
    }
  }

  // ⑤ 入力スナップのグリッド交点（表示グリッドとは無関係）
  if (ctx.gridMm !== null) {
    const g = ctx.gridMm
    const gx = Math.round(p.x / g) * g
    const gy = Math.round(p.y / g) * g
    if (dist({ x: gx, y: gy }, p) <= ctx.radiusMm) return { x: gx, y: gy, snap: 'grid', nodeId: null }
  }

  return { x: p.x, y: p.y, snap: 'none', nodeId: null }
}

function nearestIntersection(p: Pt, segments: readonly Chord[], radius: number): Pt | null {
  let best: Pt | null = null
  let bestD = radius
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const hit = segmentIntersection(segments[i]!, segments[j]!)
      if (!hit) continue
      const d = dist(hit, p)
      if (d <= bestD) {
        bestD = d
        best = hit
      }
    }
  }
  return best
}

/** 2 つの線分の交点。両方の線分の範囲（端を含む）の内側にあるときだけ */
function segmentIntersection(a: Chord, b: Chord): Pt | null {
  const rx = a.x2 - a.x1
  const ry = a.y2 - a.y1
  const sx = b.x2 - b.x1
  const sy = b.y2 - b.y1
  const denom = rx * sy - ry * sx
  if (denom === 0) return null // 平行（重なりは扱わない）
  const qx = b.x1 - a.x1
  const qy = b.y1 - a.y1
  const t = (qx * sy - qy * sx) / denom
  const u = (qx * ry - qy * rx) / denom
  if (t < 0 || t > 1 || u < 0 || u > 1) return null
  return { x: a.x1 + t * rx, y: a.y1 + t * ry }
}

function nearestOnSegment(p: Pt, segments: readonly Chord[], radius: number): Pt | null {
  let best: Pt | null = null
  let bestD = radius
  for (const s of segments) {
    const dx = s.x2 - s.x1
    const dy = s.y2 - s.y1
    const len2 = dx * dx + dy * dy
    if (len2 === 0) continue
    const t = ((p.x - s.x1) * dx + (p.y - s.y1) * dy) / len2
    if (t < 0 || t > 1) continue // 垂線の足が線分の外なら対象外
    const foot = { x: s.x1 + t * dx, y: s.y1 + t * dy }
    const d = dist(foot, p)
    if (d <= bestD) {
      bestD = d
      best = foot
    }
  }
  return best
}
