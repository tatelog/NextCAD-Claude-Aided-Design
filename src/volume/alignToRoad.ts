// 向きを合わせる（D-04 P2、A-03 G64・G18）。建物の最初の辺を、道路の向きに平行にそろえる。
import type { Point } from '../geom/viewport'
import { rotateFootprint } from './placement'

const edgeAngleDeg = (poly: readonly Point[]) => {
  const a = poly[0]!
  const b = poly[1]!
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
}

// 回す角度（度）。辺の向きは 180° の周期で同じなので、−90° から 90° の範囲に収める
export function rotationToDirection(poly: readonly Point[], targetDeg: number): number {
  const delta = targetDeg - edgeAngleDeg(poly)
  return ((((delta + 90) % 180) + 180) % 180) - 90
}

/** 「道路に平行に合わせる」を押したときに、外形を回す量（度、重心まわり）。最初の辺を道路の向きに平行にする（統括の決定 2026-11-06） */
export function alignRoadDegOf(poly: readonly Point[], roadDeg: number): number {
  if (poly.length < 2) return 0
  return rotationToDirection(poly, roadDeg)
}

// 建物の中心まわりに回し、最初の辺を道路の向きにそろえる
export function alignToDirection(poly: readonly Point[], targetDeg: number): Point[] {
  const xs = poly.map((p) => p.x)
  const ys = poly.map((p) => p.y)
  const center = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
  return rotateFootprint(poly, center, rotationToDirection(poly, targetDeg))
}
