// 仕様（統括の依頼 2026-11-05、t82。G71・G65）: 円弧の線分を含む外形を、移動・つまみで動かしても、円弧は円弧のまま。
// 仕様 1（移動）: 外形の全部の頂点を同じだけ動かすと、円弧の中心も同じだけ動く（半径は変わらない）。
// 仕様 2（つまみ）: 円弧の端点を一つだけ動かすと、中心は動かず、半径は新しい端点に合わせる。
// 仕様 3（回転）: 外形を回すと、円弧は円弧のまま。端点は回した後の頂点に一致し、中心と端点の距離（半径）は変わらない。
import { describe, expect, it } from 'vitest'
import type { Node, Segment } from '../model/schema'
import { moveOutlineVertices, rotateOutline } from './outlineEdit'
import { arcParamsOf } from './arcSegment'

const base = { stage: 'F4' as const, snap: 'node' as const, revision: 1 }

/** D 字の外形: 上の半円（中心 (0,0)、R 1000、P1 → P2）と、三つの直線（P2 → P3 → P4 → P1） */
function dShape() {
  const nodes: Node[] = [
    { id: 'P1', x: 1000, y: 0 },
    { id: 'P2', x: -1000, y: 0 },
    { id: 'P3', x: -1000, y: -1000 },
    { id: 'P4', x: 1000, y: -1000 },
  ]
  const segments: Segment[] = [
    {
      ...base,
      id: 'arc',
      x1: 1000,
      y1: 0,
      x2: -1000,
      y2: 0,
      start_node_id: 'P1',
      end_node_id: 'P2',
      curve: 'arc',
      curve_params: { center: { x: 0, y: 0 }, radius_mm: 1000, start_rad: 0, end_rad: Math.PI, ccw: true },
    },
    { ...base, id: 'l1', x1: -1000, y1: 0, x2: -1000, y2: -1000, start_node_id: 'P2', end_node_id: 'P3', curve: 'line' },
    { ...base, id: 'l2', x1: -1000, y1: -1000, x2: 1000, y2: -1000, start_node_id: 'P3', end_node_id: 'P4', curve: 'line' },
    { ...base, id: 'l3', x1: 1000, y1: -1000, x2: 1000, y2: 0, start_node_id: 'P4', end_node_id: 'P1', curve: 'line' },
  ]
  return [{ nodes, segments }]
}

const arcOf = (entries: { segments: readonly Segment[] }[]) => {
  const s = entries[0]!.segments.find((x) => x.id === 'arc')!
  return { seg: s, params: arcParamsOf(s)! }
}

describe('円弧を含む外形の移動（仕様 1・2）', () => {
  it('仕様 1: 全部の頂点を (+500, 0) 動かすと、円弧の中心も (+500, 0) 動く', () => {
    const entries = dShape()
    const from = entries[0]!.nodes.map((n) => ({ x: n.x, y: n.y }))
    const to = from.map((p) => ({ x: p.x + 500, y: p.y }))
    const { params } = arcOf(moveOutlineVertices(entries, from, to))
    expect(params.center.x).toBeCloseTo(500, 6)
    expect(params.center.y).toBeCloseTo(0, 6)
    expect(params.radius_mm).toBeCloseTo(1000, 6)
  })

  it('仕様 2: 円弧の端点 P1 だけを (1000, 100) へ動かすと、中心は (0, 0) のまま、半径は新しい端点に合う', () => {
    const entries = dShape()
    const from = [{ x: 1000, y: 0 }]
    const to = [{ x: 1000, y: 100 }]
    const moved = moveOutlineVertices(entries, [...from, ...entries[0]!.nodes.slice(1).map((n) => ({ x: n.x, y: n.y }))], [...to, ...entries[0]!.nodes.slice(1).map((n) => ({ x: n.x, y: n.y }))])
    const { seg, params } = arcOf(moved)
    expect(params.center.x).toBeCloseTo(0, 6)
    expect(params.center.y).toBeCloseTo(0, 6)
    expect(params.radius_mm).toBeCloseTo(Math.hypot(1000, 100), 6)
    expect(seg.x1).toBe(1000)
    expect(seg.y1).toBe(100)
  })
})

describe('円弧を含む外形の回転（仕様 3）', () => {
  it('仕様 3: 回すと円弧は円弧のまま。端点は回した頂点に一致し、中心から両端までの距離（半径）は変わらない', () => {
    const entries = dShape()
    const rotated = rotateOutline(entries, 90)
    const { seg, params } = arcOf(rotated)
    expect(seg.curve).toBe('arc')
    const n1 = rotated[0]!.nodes.find((n) => n.id === 'P1')!
    const n2 = rotated[0]!.nodes.find((n) => n.id === 'P2')!
    expect(seg.x1).toBe(n1.x)
    expect(seg.y1).toBe(n1.y)
    expect(seg.x2).toBe(n2.x)
    expect(seg.y2).toBe(n2.y)
    // 端点は整数 mm に丸めるので、半径との差は丸めの 1 mm 以内
    expect(Math.abs(Math.hypot(n1.x - params.center.x, n1.y - params.center.y) - params.radius_mm)).toBeLessThanOrEqual(1)
    expect(Math.abs(Math.hypot(n2.x - params.center.x, n2.y - params.center.y) - params.radius_mm)).toBeLessThanOrEqual(1)
    expect(Math.abs(params.radius_mm - 1000)).toBeLessThanOrEqual(1)
  })
})
