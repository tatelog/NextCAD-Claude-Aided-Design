// 外形が閉じているかを端点 ID で確かめる（D-02 C1「端点の共有」、C5「閉じているかだけ確かめる」）。
// 条件: すべての端点の次数が 2 で、全線分が 1 つの閉路をなす。
import type { Point } from '../geom/viewport'
import type { Segment } from '../model/schema'

export type ClosureReason = 'empty' | 'open' | 'branch' | 'disconnected'

export type ClosureResult =
  | { closed: true; footprint: Point[]; reason?: undefined }
  | { closed: false; footprint: null; reason: ClosureReason }

export function findClosedOutline(segments: readonly Segment[]): ClosureResult {
  if (segments.length === 0) return { closed: false, footprint: null, reason: 'empty' }

  const coord = new Map<string, Point>()
  const adjacency = new Map<string, Segment[]>()
  for (const s of segments) {
    coord.set(s.start_node_id, { x: s.x1, y: s.y1 })
    coord.set(s.end_node_id, { x: s.x2, y: s.y2 })
    for (const id of [s.start_node_id, s.end_node_id]) {
      const list = adjacency.get(id) ?? []
      list.push(s)
      adjacency.set(id, list)
    }
  }

  const degrees = [...adjacency.values()].map((l) => l.length)
  if (degrees.some((d) => d > 2)) return { closed: false, footprint: null, reason: 'branch' }
  if (degrees.some((d) => d < 2)) return { closed: false, footprint: null, reason: 'open' }

  // segments[0] の始点から、その向きに閉路をたどる
  const first = segments[0]!
  const footprint: Point[] = []
  const visited = new Set<string>()
  let nodeId = first.start_node_id
  let current: Segment = first
  while (!visited.has(current.id)) {
    visited.add(current.id)
    footprint.push(coord.get(nodeId)!)
    nodeId = current.start_node_id === nodeId ? current.end_node_id : current.start_node_id
    const next = (adjacency.get(nodeId) ?? []).find((s) => s.id !== current.id)
    if (!next) break
    current = next
  }

  if (visited.size !== segments.length) return { closed: false, footprint: null, reason: 'disconnected' }
  return { closed: true, footprint }
}
