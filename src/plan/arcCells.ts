// 円弧の外形に入る区画（ハブ A-03 G5・G17）。円弧の中心と半径から、区画の四隅がすべて円の内側（許容 1 mm）にあるかで決める。決定論。
// 前提: 円弧は建物の外縁で、建物は円の内側にある（凸の外形）。凹の外形や、円弧の範囲の外の判定は、ここでは扱わない。
import type { CurveEdge } from '../volume/curvedFootprint'
import type { Rect } from './candidateCells'

type Arc = Extract<CurveEdge, { kind: 'arc' }>

const TOL_MM = 1

/** 区画を円の内側（許容 1 mm）の区画と、外の区画の id に分ける */
export function cellsInsideArc(cells: readonly Rect[], arc: Arc): { inside: Rect[]; outside: string[] } {
  const r = Math.hypot(arc.a.x - arc.center.x, arc.a.y - arc.center.y)
  const inside = (x: number, y: number) => Math.hypot(x - arc.center.x, y - arc.center.y) <= r + TOL_MM
  const kept: Rect[] = []
  const outside: string[] = []
  for (const c of cells) {
    const corners = [
      [c.x0, c.y0],
      [c.x1, c.y0],
      [c.x1, c.y1],
      [c.x0, c.y1],
    ]
    if (corners.every(([x, y]) => inside(x!, y!))) kept.push(c)
    else outside.push(c.id)
  }
  return { inside: kept, outside }
}
