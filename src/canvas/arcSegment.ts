// 円弧の線分（curve: arc）。中心・半径・始終角・向きを持つ（t82・G3・G130）。
// 折れ線にするのは、描くときと計算するときだけ（弦誤差 ARC_CHORD_ERROR_MM）。点列は持たない。
import { ARC_CHORD_ERROR_MM, arcSegmentCount } from '../input/arc'
import type { Segment } from '../model/schema'

// type の別名にする（curve_params の Record<string, unknown> に代入できるように。interface は添字シグネチャを持てない）
export type ArcParams = {
  center: { x: number; y: number }
  /** 半径（mm）。中心から始点まで */
  radius_mm: number
  /** 始点の角（rad） */
  start_rad: number
  /** 終点の角（rad） */
  end_rad: number
  /** 反時計回りなら true（掃引の向き） */
  ccw: boolean
}

interface Pt {
  x: number
  y: number
}

const TWO_PI = 2 * Math.PI
const normAngle = (t: number): number => ((t % TWO_PI) + TWO_PI) % TWO_PI

/** 中心・始点・終点・向きから、円弧の持ち方を作る。半径は中心から始点まで（終点は角だけで決まる） */
export function arcParamsFromNodes(center: Pt, start: Pt, end: Pt, ccw: boolean): ArcParams {
  return {
    center: { x: center.x, y: center.y },
    radius_mm: Math.hypot(start.x - center.x, start.y - center.y),
    start_rad: Math.atan2(start.y - center.y, start.x - center.x),
    end_rad: Math.atan2(end.y - center.y, end.x - center.x),
    ccw,
  }
}

/** 線分の円弧の持ち方。円弧でない線、または持ち方が欠けているときは null */
export function arcParamsOf(s: Segment): ArcParams | null {
  if (s.curve !== 'arc') return null
  const p = s.curve_params as Partial<ArcParams> | undefined
  if (!p || !p.center || typeof p.radius_mm !== 'number' || typeof p.start_rad !== 'number' || typeof p.end_rad !== 'number' || typeof p.ccw !== 'boolean') {
    return null
  }
  return p as ArcParams
}

/** 向きに従う掃引角（rad。符号付き。反時計回りなら正） */
function sweepOf(p: ArcParams): number {
  return p.ccw ? normAngle(p.end_rad - p.start_rad) : -normAngle(p.start_rad - p.end_rad)
}

/** 円弧の線分を弦誤差 toleranceMm の折れ線にする。両端は線分の端点ちょうど（整数 mm） */
function polylineOfArc(s: Segment, p: ArcParams, toleranceMm: number): Pt[] {
  const sweep = sweepOf(p)
  const n = arcSegmentCount(p.radius_mm, Math.abs(sweep), toleranceMm)
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = p.start_rad + (sweep * i) / n
    out.push({ x: Math.round(p.center.x + p.radius_mm * Math.cos(t)) + 0, y: Math.round(p.center.y + p.radius_mm * Math.sin(t)) + 0 })
  }
  out[0] = { x: s.x1, y: s.y1 }
  out[n] = { x: s.x2, y: s.y2 }
  return out
}

/**
 * 線分を描く・吸着する・計算するための折れ線。
 * 直線は端点の 2 点、自由曲線（spline）は制御点のまま、円弧（arc）は弦誤差 10 mm で折る（G130）。
 */
export function polylineOfSegment(s: Segment): Pt[] {
  const arc = arcParamsOf(s)
  if (arc) return polylineOfArc(s, arc, ARC_CHORD_ERROR_MM)
  const cps = s.curve === 'spline' ? (s.curve_params?.control_points as Pt[] | undefined) : undefined
  if (cps && cps.length >= 2) return cps
  return [
    { x: s.x1, y: s.y1 },
    { x: s.x2, y: s.y2 },
  ]
}
