// 仕様: D-02 C1「直線化の方法」「曲線の扱い」（G6・G3・G5）。
// 直線モード: 折れ線を RDP で簡略化し、許容 8 px（仮置き）で直線にする。
// 曲線モード: 描いた曲線は曲線のまま保持する（Segment は spline。制御点を持つ）。直線には直さない。
import { describe, expect, it } from 'vitest'
import { strokeToSegments } from './strokeToSegments'
import type { Node, PenMode, Stroke } from '../model/schema'

const OPTS = { rdpTolerancePx: 8, snapRadiusMm: 240, axisSnapDeg: 3 }

// 1 px = 10 mm。原点は画面の (0,0)。y は画面の下向きが mm の −y
const stroke = (points: [number, number][], pen_mode: PenMode): Stroke => ({
  id: 's1',
  points: points.map(([px, py]) => ({ px, py })),
  view_scale: 10,
  view_origin: { px: 0, py: 0 },
  stage: 'F5',
  pen_mode,
  created_at: '2026-11-03T00:00:00.000Z',
  pen_input: 'mouse',
})

describe('直線モード（G6）: RDP 8 px で直線にする', () => {
  it('8 px 以内のふくらみは直線になる（1 本の線分）', () => {
    const r = strokeToSegments(stroke([[0, 0], [100, 5], [200, 0]], 'line'), [], OPTS)
    expect(r.segments).toHaveLength(1)
    expect(r.segments[0]).toMatchObject({ curve: 'line', x1: 0, y1: 0, x2: 2000, y2: 0 })
  })

  it('8 px を超えるふくらみは折れ線（2 本）になる', () => {
    const r = strokeToSegments(stroke([[0, 0], [100, 20], [200, 0]], 'line'), [], OPTS)
    expect(r.segments).toHaveLength(2)
    expect(r.segments.every((s) => s.curve === 'line')).toBe(true)
  })
})

describe('曲線モード（G6・G3）: 曲線のまま保持する', () => {
  it('8 px 以内のふくらみでも直線にせず、spline として制御点を全部残す', () => {
    const pts: [number, number][] = [[0, 0], [100, 5], [200, 0]]
    const r = strokeToSegments(stroke(pts, 'curve'), [], OPTS)
    expect(r.segments).toHaveLength(1)
    const s = r.segments[0]!
    expect(s.curve).toBe('spline')
    expect(s.curve_params).toBeDefined()
    expect(s.curve_params!.control_points).toEqual([
      { x: 0, y: 0 },
      { x: 1000, y: -50 },
      { x: 2000, y: 0 },
    ])
  })

  it('点を間引かない（制御点の数は描いた点の数と同じ）', () => {
    const pts: [number, number][] = [[0, 0], [50, 3], [100, 9], [150, 12], [200, 9], [250, 3], [300, 0]]
    const r = strokeToSegments(stroke(pts, 'curve'), [], OPTS)
    const cps = r.segments[0]!.curve_params!.control_points as unknown[]
    expect(cps).toHaveLength(pts.length)
  })

  it('制御点は整数 mm（実寸 mm の正本を保つ）', () => {
    const r = strokeToSegments(stroke([[0, 0], [33, 7], [100, 0]], 'curve'), [], OPTS)
    for (const p of r.segments[0]!.curve_params!.control_points as { x: number; y: number }[]) {
      expect(Number.isInteger(p.x)).toBe(true)
      expect(Number.isInteger(p.y)).toBe(true)
    }
  })

  it('両端は既存の端点に吸着して ID を共有する（直線モードと同じ規則）', () => {
    const existing: Node[] = [{ id: 'n1', x: 1000, y: 0 }]
    const r = strokeToSegments(stroke([[95, -3], [150, 20], [300, 0]], 'curve'), existing, OPTS)
    expect(r.segments[0]!.start_node_id).toBe('n1')
  })

  it('閉じた曲線（終点が始点の吸着半径内）は、黙って捨てず、同じ端点を両端にした 1 本の spline になる', () => {
    // 終点 (2,1) px は始点 (0,0) から 20 mm 以内なので同じ端点に吸着する
    const r = strokeToSegments(stroke([[0, 0], [100, 20], [200, 0], [2, 1]], 'curve'), [], OPTS)
    expect(r.segments).toHaveLength(1)
    const s = r.segments[0]!
    expect(s.curve).toBe('spline')
    expect(s.start_node_id).toBe(s.end_node_id)
    expect(r.nodes).toHaveLength(1)
  })

  it('曲線モードでも、1 本のストロークは 1 本の Segment と 2 つの端点になる', () => {
    const r = strokeToSegments(stroke([[0, 0], [100, 20], [200, 0]], 'curve'), [], OPTS)
    expect(r.segments).toHaveLength(1)
    expect(r.nodes).toHaveLength(2)
  })
})
