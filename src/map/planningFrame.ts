import type { Point } from '../geom/viewport'
import type { ParcelFrame } from './parcelPlane'

export function rotatePlanPoint(p: Point, degrees: number): Point {
  const a = degrees * Math.PI / 180
  return { x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) }
}

export function alignEdgeAngle(lot: readonly Point[], edge: number): number {
  const a = lot[edge], b = lot[(edge + 1) % lot.length]
  if (!a || !b || (a.x === b.x && a.y === b.y)) throw new Error('基準辺を選んでください')
  return -Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI
}

export function withPlanningAngle<T extends { lot: Point[] | null; frame: ParcelFrame | null }>(site: T, degrees: number): T {
  if (!Number.isFinite(degrees)) throw new Error('角度が不正です')
  const delta = degrees - (site.frame?.rotationDeg ?? 0)
  return { ...site, lot: site.lot?.map((p) => rotatePlanPoint(p, delta)) ?? null,
    frame: site.frame ? { ...site.frame, rotationDeg: degrees } : null }
}
