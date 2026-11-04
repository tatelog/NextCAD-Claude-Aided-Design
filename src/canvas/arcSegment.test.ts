// 仕様（統括の依頼 2026-11-05、t82。G3・G130）: 円弧を spline の点列ではなく curve: arc（中心・半径・始終角・向き）で持つ。
// 折れ線にするのは、描くときと計算するときだけ（弦誤差 10 mm）。
// 仕様 1（持ち方）: 円弧の線分は curve: arc。curve_params に center・radius_mm・start_rad・end_rad・ccw を持ち、制御点は持たない。
// 仕様 2（端）: 折れ線の両端は、線分の端点ちょうど。
// 仕様 3（誤差）: 折れ線の点は円の上（半径の ±1 mm）にあり、どの区間も弦の中点が円から 10 mm 以内。区間の数は arcSegmentCount と同じ。
// 仕様 4（直線・自由曲線）: 直線は端点の 2 点。自由曲線は制御点のまま。
// 仕様 5（P2・P3 の両方）: 中心方式と二点方式で作った円弧の線は、線分にすると curve: arc になる。
// 仕様 6（吸着）: 円弧の線分の上に、既存の線分として吸着する（折れ線の上で）。
import { describe, expect, it } from 'vitest'
import { arcFromCenterStart, arcFromTwoPoints, arcSegmentCount } from '../input/arc'
import { snapPoint } from '../input/snap'
import type { Segment, Stroke } from '../model/schema'
import { strokeToSegments } from './strokeToSegments'
import { arcParamsFromNodes, polylineOfSegment } from './arcSegment'

const base = { id: 's', stroke_id: undefined, stage: 'F4' as const, snap: 'node' as const, revision: 1 }

/** 円弧の線分（中心 (0,0)、R 1000、第一象限の 1/4。始点 (1000,0) から終点 (0,1000) へ反時計回り） */
const quarterArc: Segment = {
  ...base,
  x1: 1000,
  y1: 0,
  x2: 0,
  y2: 1000,
  start_node_id: 'a',
  end_node_id: 'b',
  curve: 'arc',
  curve_params: arcParamsFromNodes({ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 0, y: 1000 }, true),
}

describe('円弧の線分の持ち方（仕様 1）', () => {
  it('中心・半径・始終角・向きを持ち、制御点は持たない', () => {
    const p = quarterArc.curve_params as Record<string, unknown>
    expect(quarterArc.curve).toBe('arc')
    expect(p.center).toEqual({ x: 0, y: 0 })
    expect(p.radius_mm).toBeCloseTo(1000, 6)
    expect(p.start_rad).toBeCloseTo(0, 6)
    expect(p.end_rad).toBeCloseTo(Math.PI / 2, 6)
    expect(p.ccw).toBe(true)
    expect(p).not.toHaveProperty('control_points')
  })
})

describe('折れ線化（仕様 2・3）', () => {
  it('仕様 2: 両端は線分の端点ちょうど', () => {
    const pts = polylineOfSegment(quarterArc)
    expect(pts[0]).toEqual({ x: 1000, y: 0 })
    expect(pts[pts.length - 1]).toEqual({ x: 0, y: 1000 })
  })

  it('仕様 3: 点は円の上（±1 mm）にあり、区間の数は arcSegmentCount と同じ', () => {
    const pts = polylineOfSegment(quarterArc)
    for (const p of pts) expect(Math.abs(Math.hypot(p.x, p.y) - 1000)).toBeLessThanOrEqual(1)
    expect(pts).toHaveLength(arcSegmentCount(1000, Math.PI / 2) + 1)
  })

  it('仕様 3: どの区間も、弦の中点が円から 10 mm 以内（丸めの 1 mm を見込む）', () => {
    const pts = polylineOfSegment(quarterArc)
    for (let i = 0; i < pts.length - 1; i++) {
      const mx = (pts[i]!.x + pts[i + 1]!.x) / 2
      const my = (pts[i]!.y + pts[i + 1]!.y) / 2
      expect(1000 - Math.hypot(mx, my)).toBeLessThanOrEqual(11)
    }
  })
})

describe('直線と自由曲線は変わらない（仕様 4）', () => {
  it('直線は端点の 2 点', () => {
    const line: Segment = { ...base, x1: 0, y1: 0, x2: 500, y2: 0, start_node_id: 'a', end_node_id: 'b', curve: 'line' }
    expect(polylineOfSegment(line)).toEqual([
      { x: 0, y: 0 },
      { x: 500, y: 0 },
    ])
  })

  it('自由曲線（spline）は制御点のまま', () => {
    const cps = [
      { x: 0, y: 0 },
      { x: 100, y: 300 },
      { x: 500, y: 0 },
    ]
    const spline: Segment = { ...base, x1: 0, y1: 0, x2: 500, y2: 0, start_node_id: 'a', end_node_id: 'b', curve: 'spline', curve_params: { control_points: cps } }
    expect(polylineOfSegment(spline)).toEqual(cps)
  })
})

describe('P2・P3 の入口（仕様 5）', () => {
  const opts = { rdpTolerancePx: 8, snapRadiusMm: 240, axisSnapDeg: 3 }
  /** 円弧の点列から、円弧の線（Stroke）を作る（addArcResultStroke と同じ組み方） */
  const arcStroke = (arc: ReturnType<typeof arcFromCenterStart>): Stroke => ({
    id: 'arc-test',
    points: arc.points.map((p) => ({ px: p.x, py: -p.y })),
    view_scale: 1,
    view_origin: { px: 0, py: 0 },
    stage: 'F4',
    pen_mode: 'curve',
    created_at: '2026-11-05T00:00:00.000Z',
    pen_input: 'mouse',
    arc: { center: { x: arc.center.x, y: arc.center.y }, ccw: arc.ccw },
  })

  it('中心方式（G130）の円弧は curve: arc の線分になる', () => {
    const arc = arcFromCenterStart({ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 0, y: 1000 })
    const [seg] = strokeToSegments(arcStroke(arc), [], opts).segments
    expect(seg?.curve).toBe('arc')
    expect(seg?.curve_params).not.toHaveProperty('control_points')
  })

  it('二点方式（t70）の円弧も curve: arc の線分になる', () => {
    const arc = arcFromTwoPoints({ x: -1000, y: 0 }, { x: 1000, y: 0 }, 500)
    const [seg] = strokeToSegments(arcStroke(arc), [], opts).segments
    expect(seg?.curve).toBe('arc')
  })
})

describe('吸着（仕様 6）', () => {
  it('円弧の線分の区間の中ほどに寄せた点は、線分上に吸着する', () => {
    // 区間（折れ線の 2 点目と 3 点目）の中点から、径方向に 1 % 外へずらした点。頂点の外側は吸着の対象外（既存の線と同じ）
    const pts = polylineOfSegment(quarterArc)
    const a = pts[2]!
    const b = pts[3]!
    const raw = { x: Math.round(((a.x + b.x) / 2) * 1.01), y: Math.round(((a.y + b.y) / 2) * 1.01) }
    const r = snapPoint(raw, { nodes: [], segments: [quarterArc], prev: null, radiusMm: 240, axisDeg: 3, gridMm: null })
    expect(r.snap).toBe('on_segment')
  })
})
