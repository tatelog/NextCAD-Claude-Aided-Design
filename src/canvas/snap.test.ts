// 仕様（D-02 C1「スナップ先と優先順」「端点の共有」「曲線の扱い」、G6・G36・G37）から書いたテスト。
// 優先順: ①既存の端点 ②既存線分の交点 ③既存線分上（垂線の足）④水平・垂直（±3°）⑤入力スナップのグリッド交点。
// 吸着半径は画面 px で決め、mm に換算する（24 px は仮置き）。view_scale は 10 mm/px としてテストを書く。
import { describe, expect, it } from 'vitest'
import type { Node, Segment, Stroke } from '../model/schema'
import { strokeToSegments, type StrokeToSegmentsOptions } from './strokeToSegments'

const stroke = (
  mmPoints: { x: number; y: number }[],
  over: Partial<Stroke> = {},
): Stroke => ({
  id: 'st-1',
  // view_origin を 0 にし、1 px = 10 mm。mm の y は画面の y と逆向きなので py = -y / 10
  points: mmPoints.map((p) => ({ px: p.x / 10, py: -p.y / 10 })),
  view_scale: 10,
  view_origin: { px: 0, py: 0 },
  stage: 'F5',
  pen_mode: 'line',
  created_at: '2026-11-03T00:00:00.000Z',
  pen_input: 'mouse',
  ...over,
})

const opts = (over: Partial<StrokeToSegmentsOptions> = {}): StrokeToSegmentsOptions => ({
  rdpTolerancePx: 8,
  snapRadiusMm: 300, // 24 px × 10 mm/px は 240 mm。テストでは余裕を取って 300 mm
  axisSnapDeg: 3,
  gridMm: null,
  ...over,
})

const node = (id: string, x: number, y: number): Node => ({ id, x, y })
const seg = (id: string, a: Node, b: Node): Segment => ({
  id,
  x1: a.x,
  y1: a.y,
  x2: b.x,
  y2: b.y,
  start_node_id: a.id,
  end_node_id: b.id,
  snap: 'none',
  stage: 'F5',
  revision: 1,
  curve: 'line',
})

describe('①既存の端点への吸着（D-02 C1「端点の共有」）', () => {
  it('半径内の既存端点に始点が吸着したら、新しい端点を作らず既存の ID を共有する', () => {
    const a = node('A', 0, 0)
    const { segments, nodes } = strokeToSegments(
      stroke([
        { x: 100, y: 100 },
        { x: 5000, y: 100 },
      ]),
      [a],
      opts(),
    )
    expect(segments[0]!.start_node_id).toBe('A')
    expect(nodes.some((n) => n.id === 'A')).toBe(false)
  })

  it('端点の吸着は線分上・交点より優先される（半径内なら端点が勝つ）', () => {
    const near = node('N', 5050, 0) // 線分の足 (5000,0) よりも少し離れているが半径内
    const s1 = seg('S1', node('P', 0, 0), node('Q', 10000, 0))
    const { segments } = strokeToSegments(
      stroke([
        { x: 5000, y: 200 },
        { x: 8000, y: 200 },
      ]),
      [near, node('P', 0, 0), node('Q', 10000, 0)],
      opts(),
      [s1],
    )
    expect(segments[0]!.start_node_id).toBe('N')
    expect(segments[0]!.snap).toBe('node')
  })
})

describe('③既存線分上（垂線の足）（D-02 C1「スナップ先と優先順」）', () => {
  it('半径内の既存線分上に点があれば、その垂線の足に端点を作り on_segment と記録する', () => {
    const s1 = seg('S1', node('P', 0, 0), node('Q', 10000, 0))
    const { segments, nodes } = strokeToSegments(
      stroke([
        { x: 5000, y: 200 },
        { x: 8000, y: 200 },
      ]),
      [node('P', 0, 0), node('Q', 10000, 0)],
      opts(),
      [s1],
    )
    const start = nodes.find((n) => n.x === 5000)
    expect(start).toEqual({ id: expect.any(String), x: 5000, y: 0 })
    expect(segments[0]!.x1).toBe(5000)
    expect(segments[0]!.y1).toBe(0)
    expect(segments[0]!.snap).toBe('on_segment')
  })
})

describe('②既存線分の交点（D-02 C1「スナップ先と優先順」）', () => {
  it('交点が半径内にあれば、線分上（③）より交点（②）を優先する', () => {
    // 横の線分（y=0）と縦の線分（x=5000）が (5000,0) で交わる
    const h = seg('H', node('H1', 0, 0), node('H2', 10000, 0))
    const v = seg('V', node('V1', 5000, -5000), node('V2', 5000, 5000))
    const { segments } = strokeToSegments(
      stroke([
        { x: 5100, y: 200 },
        { x: 8000, y: 200 },
      ]),
      [node('H1', 0, 0), node('H2', 10000, 0), node('V1', 5000, -5000), node('V2', 5000, 5000)],
      opts(),
      [h, v],
    )
    expect(segments[0]!.x1).toBe(5000)
    expect(segments[0]!.y1).toBe(0)
    expect(segments[0]!.snap).toBe('intersection')
  })
})

describe('④水平・垂直への吸着（D-02 C1、±3 度）', () => {
  it('±3 度以内のずれは、直前の頂点の水平（または垂直）に揃える', () => {
    const { segments } = strokeToSegments(
      stroke([
        { x: 0, y: 0 },
        { x: 5000, y: 100 }, // 角度 約 1.1 度
      ]),
      [],
      opts(),
    )
    expect(segments[0]!.x2).toBe(5000)
    expect(segments[0]!.y2).toBe(0)
    expect(segments[0]!.snap).toBe('axis')
  })

  it('吸着先が既存の端点と一致したら、その端点を共有する（軸吸着後の再照合）', () => {
    // 前の頂点 (0,2000) から水平に揃えると (4000,2000) に来る。そこに既存の端点 N がある。
    // 生の点 (4000,2150) は半径 100 mm の外なので、軸吸着の後で初めて N に一致する。
    const n = node('N', 4000, 2000)
    const { segments, nodes } = strokeToSegments(
      stroke([
        { x: 0, y: 2000 },
        { x: 4000, y: 2150 },
      ]),
      [n],
      opts({ snapRadiusMm: 100 }),
    )
    expect(segments[0]!.end_node_id).toBe('N')
    expect(nodes.some((x) => x.x === 4000 && x.y === 2000)).toBe(false)
  })
})

describe('⑤入力スナップのグリッド交点（別設定。gridMm が null なら吸着しない）', () => {
  it('グリッドが有効で半径内にあれば、格子の交点に吸着する', () => {
    const { nodes } = strokeToSegments(
      stroke([
        { x: 4900, y: 1100 },
        { x: 8000, y: 1100 },
      ]),
      [],
      opts({ gridMm: 1000 }),
    )
    expect(nodes[0]).toEqual({ id: expect.any(String), x: 5000, y: 1000 })
  })

  it('グリッドが無効（null）なら、格子には吸着しない', () => {
    const { nodes } = strokeToSegments(
      stroke([
        { x: 4900, y: 1100 },
        { x: 8000, y: 1100 },
      ]),
      [],
      opts({ gridMm: null }),
    )
    expect(nodes[0]).toEqual({ id: expect.any(String), x: 4900, y: 1100 })
  })
})

describe('曲線モード（G6・G3。曲線は曲線のまま保持する）', () => {
  it('曲線モードでは RDP で潰さず、一本の spline Segment に制御点を残す', () => {
    // 直線モードなら 2 点に潰れるほど緩い曲線（8 px 以内に収まる）
    const pts = Array.from({ length: 20 }, (_, i) => ({ x: i * 500, y: Math.round(i * (20 - i) * 2) }))
    const { segments, nodes } = strokeToSegments(
      stroke(pts, { pen_mode: 'curve' }),
      [],
      opts(),
    )
    expect(segments).toHaveLength(1)
    const s = segments[0]!
    expect(s.curve).toBe('spline')
    const cps = s.curve_params?.control_points as { x: number; y: number }[]
    expect(cps).toHaveLength(20)
    expect(cps[0]).toEqual({ x: 0, y: 0 })
    // 端点は両端だけ。途中の制御点は端点にしない
    expect(nodes).toHaveLength(2)
  })

  it('直線モードは従来どおり RDP で潰れる（同じ入力で 2 点になる）', () => {
    const pts = Array.from({ length: 20 }, (_, i) => ({ x: i * 500, y: Math.round(i * (20 - i) * 2) }))
    const { segments } = strokeToSegments(stroke(pts, { pen_mode: 'line' }), [], opts())
    expect(segments.every((s) => s.curve === 'line')).toBe(true)
    expect(segments.length).toBeLessThan(19)
  })
})
