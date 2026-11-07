import type { Point } from '../geom/viewport'

export function lineEnd(start: Point, point: Point, shift: boolean): Point {
  if (!shift) return point
  return Math.abs(point.x-start.x) >= Math.abs(point.y-start.y)
    ? {x:point.x,y:start.y} : {x:start.x,y:point.y}
}
export function lineClick(start: Point | null, point: Point, shift: boolean): {start: Point | null; commit: [Point, Point] | null} {
  if (!start) return {start:point,commit:null}
  const end=lineEnd(start,point,shift)
  if (end.x===start.x && end.y===start.y) return {start,commit:null}
  return {start:null,commit:[start,end]}
}
