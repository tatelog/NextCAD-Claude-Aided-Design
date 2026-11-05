// 描いた円弧（中心と向きを持つ線）を、円弧の外形（CurveEdge）として取り出す（ハブ A-03 G5）。決定論。
// 線の点（px）は view_origin と view_scale で mm に直す（y は上向き）。円弧でない線と、点が 2 つ未満の線は取らない。
import type { Point } from '../geom/viewport'
import type { CurveEdge } from './curvedFootprint'
import { arcOfStroke } from './curvedGrid'

type Arc = Extract<CurveEdge, { kind: 'arc' }>

interface ArcStrokeLike {
  points: readonly { px: number; py: number }[]
  view_scale: number
  view_origin: { px: number; py: number }
  arc?: { center: Point; ccw: boolean }
}

/** px の点を mm（y は上向き）に直す */
const toMm = (s: ArcStrokeLike, p: { px: number; py: number }): Point => ({
  x: (p.px - s.view_origin.px) * s.view_scale,
  y: -(p.py - s.view_origin.py) * s.view_scale,
})

/** 円弧の線だけを、円弧の外形にして取り出す */
export function outlineArcsOf(entries: readonly { stroke: ArcStrokeLike }[]): Arc[] {
  return entries.flatMap(({ stroke }): Arc[] => {
    if (!stroke.arc || stroke.points.length < 2) return []
    const first = stroke.points[0]!
    const last = stroke.points[stroke.points.length - 1]!
    return [arcOfStroke({ center: stroke.arc.center, ccw: stroke.arc.ccw, start: toMm(stroke, first), end: toMm(stroke, last) })]
  })
}
