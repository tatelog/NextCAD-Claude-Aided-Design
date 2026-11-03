// ストロークの整形: Stroke（px）→ 整数 mm → Segment。
//  直線モード（G6）: RDP で簡略化（許容は画面 px）→ 頂点ごとに入力スナップ（snapPoint）→ 直線の Segment。
//  曲線モード（G6・G3）: 点を間引かず、両端だけスナップして 1 本の spline（制御点を持つ）にする。
// スナップの優先順と半径は snapPoint（input/snap.ts）が持つ。
import { simplifyRdp } from '../geom/rdp'
import { snapPoint, type SnapResult } from '../input/snap'
import type { Node, Segment, Snap, Stroke } from '../model/schema'

export interface StrokeToSegmentsOptions {
  /** RDP の許容誤差（画面 px）。仮置き 8 */
  rdpTolerancePx: number
  /** 吸着半径（mm）。snapRadiusMm(mmPerPx) で作る */
  snapRadiusMm: number
  /** 水平・垂直に吸着する角度（度）。仮置き 3 */
  axisSnapDeg: number
  /** 入力スナップのグリッド間隔（mm）。省略か null で無効 */
  gridMm?: number | null
}

export interface StrokeToSegmentsResult {
  segments: Segment[]
  /** この Stroke で新しく生まれた端点（既存の端点を共有した分は含まない） */
  nodes: Node[]
}

const newId = (): string => crypto.randomUUID()

interface Mm {
  x: number
  y: number
}

// `|| 0` は -0 を 0 に揃える（整数 mm に -0 は要らない）
const toMm = (stroke: Stroke, p: { px: number; py: number }): Mm => ({
  x: Math.round((p.px - stroke.view_origin.px) * stroke.view_scale) || 0,
  y: Math.round(-(p.py - stroke.view_origin.py) * stroke.view_scale) || 0,
})

/** existingSegments は交点・線分上への吸着に使う既存の線分（省略時は端点だけ） */
export function strokeToSegments(
  stroke: Stroke,
  existingNodes: readonly Node[],
  opts: StrokeToSegmentsOptions,
  existingSegments: readonly Segment[] = [],
): StrokeToSegmentsResult {
  if (stroke.pen_mode === 'curve') return curveToSegment(stroke, existingNodes, existingSegments, opts)
  return lineToSegments(stroke, existingNodes, existingSegments, opts)
}

function lineToSegments(
  stroke: Stroke,
  existingNodes: readonly Node[],
  existing: readonly Segment[],
  opts: StrokeToSegmentsOptions,
): StrokeToSegmentsResult {
  const simplified = simplifyRdp(
    stroke.points.map((p) => ({ x: p.px, y: p.py })),
    opts.rdpTolerancePx,
  )
  const vertices = simplified.map((p) => toMm(stroke, { px: p.x, py: p.y }))

  const known: Node[] = [...existingNodes]
  const created: Node[] = []
  const segments: Segment[] = []

  let prev: { node: Node; snap: Snap } | null = null

  for (const raw of vertices) {
    const r = snapVertex(raw, known, existing, prev?.node ?? null, opts)
    let node: Node
    if (r.nodeId) {
      node = known.find((n) => n.id === r.nodeId)!
    } else {
      node = { id: newId(), x: r.x, y: r.y }
      known.push(node)
      created.push(node)
    }

    if (prev && prev.node.id !== node.id && (prev.node.x !== node.x || prev.node.y !== node.y)) {
      segments.push({
        id: newId(),
        x1: prev.node.x,
        y1: prev.node.y,
        x2: node.x,
        y2: node.y,
        start_node_id: prev.node.id,
        end_node_id: node.id,
        snap: stronger(prev.snap, r.snap),
        stroke_id: stroke.id,
        stage: stroke.stage,
        revision: 1,
        curve: 'line',
      })
    }
    prev = { node, snap: r.snap }
  }

  return { segments, nodes: created }
}

/** 曲線モード: 両端だけスナップし、間の点は描いたまま 1 本の spline にする */
function curveToSegment(
  stroke: Stroke,
  existingNodes: readonly Node[],
  existing: readonly Segment[],
  opts: StrokeToSegmentsOptions,
): StrokeToSegmentsResult {
  if (stroke.points.length < 2) return { segments: [], nodes: [] }
  const pts = stroke.points.map((p) => toMm(stroke, { px: p.px, py: p.py }))
  const known: Node[] = [...existingNodes]
  const created: Node[] = []

  const endpoint = (raw: Mm, prev: Node | null): { node: Node; snap: SnapResult['snap'] } => {
    const r = snapVertex(raw, known, existing, prev, opts)
    if (r.nodeId) return { node: known.find((n) => n.id === r.nodeId)!, snap: r.snap }
    const node: Node = { id: newId(), x: r.x, y: r.y }
    known.push(node)
    created.push(node)
    return { node, snap: r.snap }
  }

  const start = endpoint(pts[0]!, null)
  const end = endpoint(pts[pts.length - 1]!, start.node)
  // 閉じた曲線（終点が始点の端点に吸着）は、同じ端点を両端にした spline として残す。点が 2 つだけなら線ではなくクリックなので捨てる
  if (start.node.id === end.node.id && pts.length < 3) return { segments: [], nodes: created }

  // 制御点の両端は、スナップ後の端点の座標にそろえる（曲線が端点から離れないように）
  const controlPoints = pts.map((p, i) => {
    if (i === 0) return { x: start.node.x, y: start.node.y }
    if (i === pts.length - 1) return { x: end.node.x, y: end.node.y }
    return { x: p.x, y: p.y }
  })

  const segment: Segment = {
    id: newId(),
    x1: start.node.x,
    y1: start.node.y,
    x2: end.node.x,
    y2: end.node.y,
    start_node_id: start.node.id,
    end_node_id: end.node.id,
    snap: stronger(start.snap, end.snap),
    stroke_id: stroke.id,
    stage: stroke.stage,
    revision: 1,
    curve: 'spline',
    curve_params: { control_points: controlPoints },
  }
  return { segments: [segment], nodes: created }
}

// スナップの強さの順（D-02 C1 の優先順。前にあるほど強い）
const SNAP_ORDER: Snap[] = ['node', 'intersection', 'on_segment', 'axis', 'grid', 'none']

/** 線分の両端のうち、強い方のスナップを線分の記録にする */
const stronger = (a: Snap, b: Snap): Snap => (SNAP_ORDER.indexOf(a) <= SNAP_ORDER.indexOf(b) ? a : b)

/** 1 つの頂点をスナップする。直前の頂点（prev）は水平・垂直に使う */
function snapVertex(
  raw: Mm,
  nodes: readonly Node[],
  segments: readonly Segment[],
  prev: Node | null,
  opts: StrokeToSegmentsOptions,
): SnapResult {
  return snapPoint(raw, {
    nodes,
    segments,
    prev,
    radiusMm: opts.snapRadiusMm,
    axisDeg: opts.axisSnapDeg,
    gridMm: opts.gridMm ?? null,
  })
}
