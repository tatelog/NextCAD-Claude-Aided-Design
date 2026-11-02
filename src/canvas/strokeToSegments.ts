// 直線モードの整形: Stroke（px）→ RDP → 整数 mm → 端点の共有と水平垂直の吸着 → Segment。
// スナップの優先順は D-02 C1 の ①既存の端点 → ④水平・垂直。②交点 ③線分上 ⑤グリッドは次の一枚。
import { simplifyRdp } from '../geom/rdp'
import type { Node, Segment, Snap, Stroke } from '../model/schema'

export interface StrokeToSegmentsOptions {
  /** RDP の許容誤差（画面 px）。仮置き 8 */
  rdpTolerancePx: number
  /** 既存の端点に吸着する半径（mm） */
  snapRadiusMm: number
  /** 水平・垂直に吸着する角度（度）。仮置き 3 */
  axisSnapDeg: number
}

export interface StrokeToSegmentsResult {
  segments: Segment[]
  /** この Stroke で新しく生まれた端点（既存の端点を共有した分は含まない） */
  nodes: Node[]
}

const newId = (): string => crypto.randomUUID()

export function strokeToSegments(
  stroke: Stroke,
  existingNodes: readonly Node[],
  opts: StrokeToSegmentsOptions,
): StrokeToSegmentsResult {
  const simplified = simplifyRdp(
    stroke.points.map((p) => ({ x: p.px, y: p.py })),
    opts.rdpTolerancePx,
  )
  // `|| 0` は -0 を 0 に揃える（整数 mm に -0 は要らない）
  const vertices = simplified.map((p) => ({
    x: Math.round((p.x - stroke.view_origin.px) * stroke.view_scale) || 0,
    y: Math.round(-(p.y - stroke.view_origin.py) * stroke.view_scale) || 0,
  }))

  const known: Node[] = [...existingNodes]
  const created: Node[] = []
  const segments: Segment[] = []
  const tanAxis = Math.tan((opts.axisSnapDeg * Math.PI) / 180)

  let prev: { node: Node; snapped: boolean } | null = null

  for (const raw of vertices) {
    let node = nearestNode(known, raw, opts.snapRadiusMm)
    let snap: Snap = 'none'
    if (node) {
      snap = 'node'
    } else {
      let { x, y } = raw
      if (prev) {
        const dx = x - prev.node.x
        const dy = y - prev.node.y
        if (dx !== 0 && Math.abs(dy) <= Math.abs(dx) * tanAxis && dy !== 0) {
          y = prev.node.y
          snap = 'axis'
        } else if (dy !== 0 && Math.abs(dx) <= Math.abs(dy) * tanAxis && dx !== 0) {
          x = prev.node.x
          snap = 'axis'
        }
      }
      node = { id: newId(), x, y }
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
        snap: prev.snapped || snap === 'node' ? 'node' : snap,
        stroke_id: stroke.id,
        stage: stroke.stage,
        revision: 1,
        curve: 'line',
      })
    }
    prev = { node, snapped: snap === 'node' }
  }

  return { segments, nodes: created }
}

function nearestNode(nodes: readonly Node[], p: { x: number; y: number }, radius: number): Node | null {
  let best: Node | null = null
  let bestD = radius
  for (const n of nodes) {
    const d = Math.hypot(n.x - p.x, n.y - p.y)
    if (d <= bestD) {
      bestD = d
      best = n
    }
  }
  return best
}
