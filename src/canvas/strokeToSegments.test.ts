// 仕様（直線モード）:
// - D-02 C1「直線化の方法」: RDP で簡略化して直線にする（許容 8 px 仮置き）
// - E-01: points は px。view_scale（mm/px）で実寸に換算。ズームしても既存の線分の寸法は変えない
// - E-02: 座標は整数 mm。線分は端点 ID で参照し合う
// - D-02 C1「端点の共有」: スナップ半径内で既存の端点に吸着したら、新しい端点を作らずその ID を共有する
// - D-02 C1「スナップ先と優先順」: ①既存の端点 … ④水平・垂直への吸着（±3 度以内）
import { describe, expect, it } from 'vitest'
import type { Stroke } from '../model/schema'
import { strokeToSegments } from './strokeToSegments'

const baseStroke = (points: { px: number; py: number }[], over: Partial<Stroke> = {}): Stroke => ({
  id: 'st-1',
  points,
  view_scale: 10, // 1 px = 10 mm
  view_origin: { px: 0, py: 0 },
  stage: 'F4',
  pen_mode: 'line',
  created_at: '2026-11-03T00:00:00.000Z',
  pen_input: 'mouse',
  ...over,
})

const opts = { rdpTolerancePx: 8, snapRadiusMm: 300, axisSnapDeg: 3 }

describe('strokeToSegments（直線モード）', () => {
  it('ほぼ水平の一筆は 1 本の Segment になり、座標は整数 mm で view_scale 倍される', () => {
    const stroke = baseStroke([
      { px: 0, py: 0 },
      { px: 50, py: 1 },
      { px: 100, py: 0 },
    ])
    const { segments, nodes } = strokeToSegments(stroke, [], opts)
    expect(segments).toHaveLength(1)
    const s = segments[0]!
    expect([s.x1, s.y1, s.x2, s.y2].every(Number.isInteger)).toBe(true)
    expect({ x1: s.x1, y1: s.y1 }).toEqual({ x1: 0, y1: 0 })
    expect(s.x2).toBe(1000)
    expect(s.curve).toBe('line')
    expect(s.stage).toBe('F4')
    expect(s.stroke_id).toBe('st-1')
    expect(nodes).toHaveLength(2)
    expect(s.start_node_id).toBe(nodes[0]!.id)
    expect(s.end_node_id).toBe(nodes[1]!.id)
  })

  it('mm の +y は画面の上向き（px の −y）', () => {
    const stroke = baseStroke([
      { px: 0, py: 100 },
      { px: 0, py: 0 },
    ])
    const { segments } = strokeToSegments(stroke, [], opts)
    expect(segments[0]!.y1).toBe(-1000)
    expect(segments[0]!.y2).toBe(0)
  })

  it('L 字の一筆は 2 本になり、角の端点を共有する', () => {
    const stroke = baseStroke([
      { px: 0, py: 0 },
      { px: 100, py: 0 },
      { px: 100, py: 100 },
    ])
    const { segments, nodes } = strokeToSegments(stroke, [], opts)
    expect(segments).toHaveLength(2)
    expect(nodes).toHaveLength(3)
    expect(segments[0]!.end_node_id).toBe(segments[1]!.start_node_id)
  })

  it('±3 度以内の傾きは水平・垂直に吸着し、snap は axis になる', () => {
    // 1000 mm 進んで 40 mm 上がる ≒ 2.3 度
    const stroke = baseStroke([
      { px: 0, py: 0 },
      { px: 100, py: -4 },
    ])
    const { segments } = strokeToSegments(stroke, [], opts)
    expect(segments[0]!.y2).toBe(segments[0]!.y1)
    expect(segments[0]!.snap).toBe('axis')
  })

  it('3 度を超える傾きは吸着しない', () => {
    // 1000 mm 進んで 100 mm 上がる ≒ 5.7 度
    const stroke = baseStroke([
      { px: 0, py: 0 },
      { px: 100, py: -10 },
    ])
    const { segments } = strokeToSegments(stroke, [], opts)
    expect(segments[0]!.y2).not.toBe(segments[0]!.y1)
    expect(segments[0]!.snap).toBe('none')
  })

  it('既存の端点のスナップ半径内で始まる線は、その端点 ID を共有し、snap は node になる', () => {
    const existing = [{ id: 'n-exist', x: 1000, y: 0 }]
    const stroke = baseStroke([
      { px: 102, py: 1 }, // (1020, -10) mm: 既存端点から 22 mm
      { px: 102, py: -100 },
    ])
    const { segments, nodes } = strokeToSegments(stroke, existing, opts)
    expect(segments[0]!.start_node_id).toBe('n-exist')
    expect({ x: segments[0]!.x1, y: segments[0]!.y1 }).toEqual({ x: 1000, y: 0 })
    expect(segments[0]!.snap).toBe('node')
    // 既存端点は新しい nodes には重複して入らない
    expect(nodes.filter((n) => n.id === 'n-exist')).toHaveLength(0)
  })

  it('端点のスナップは水平垂直の吸着より優先する', () => {
    const existing = [{ id: 'n-exist', x: 1000, y: 50 }]
    const stroke = baseStroke([
      { px: 0, py: 0 },
      { px: 101, py: -4 }, // 終点 (1010, 40): 既存端点から約 14 mm、傾きは 2.3 度
    ])
    const { segments } = strokeToSegments(stroke, existing, opts)
    expect(segments[0]!.end_node_id).toBe('n-exist')
    expect({ x: segments[0]!.x2, y: segments[0]!.y2 }).toEqual({ x: 1000, y: 50 })
    expect(segments[0]!.snap).toBe('node')
  })

  it('描いた後にズームしても Segment の mm は変わらない（換算は Stroke が持つ view_scale で決まる）', () => {
    const stroke = baseStroke([
      { px: 0, py: 0 },
      { px: 100, py: 0 },
    ])
    const a = strokeToSegments(stroke, [], opts).segments[0]!
    const b = strokeToSegments({ ...stroke }, [], opts).segments[0]!
    expect([a.x1, a.y1, a.x2, a.y2]).toEqual([b.x1, b.y1, b.x2, b.y2])
    expect(a.x2 - a.x1).toBe(1000)
  })

  it('長さ 0 の線（点）は Segment を生まない', () => {
    const stroke = baseStroke([
      { px: 10, py: 10 },
      { px: 10, py: 10 },
    ])
    const { segments } = strokeToSegments(stroke, [], opts)
    expect(segments).toHaveLength(0)
  })
})
