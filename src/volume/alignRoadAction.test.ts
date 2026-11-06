// 仕様（統括の決定 2026-11-06。「道路に平行に合わせる」: 押したら、平面の外形の線そのものを回して、前面道路の辺に平行にする。2D と 3D が同じ向きになる）:
// 仕様 AL1: 押すと、外形の最初の辺が前面道路の辺の向きに平行になる（角度の差は 180° の周期で 0）。
// 仕様 AL2: 回す中心は外形の重心（つまみの「回す」と同じ）。重心は動かない。
// 仕様 AL3: もう一度押しても、もう回らない（回す量は 0）。
import { describe, expect, it } from 'vitest'
import type { Point } from '../geom/viewport'
import { outlineCentroid } from './rotation'
import { alignRoadDegOf } from './alignToRoad'
import { rotateFootprint } from './placement'

// 不整形の外形（mm）。最初の辺は (0,0)→(40 m,3 m)
const OUTLINE: Point[] = [
  { x: 0, y: 0 },
  { x: 40_000, y: 3_000 },
  { x: 38_000, y: 20_000 },
  { x: 0, y: 15_000 },
]
const ROAD_DEG = 15

const edgeDegOf = (poly: readonly Point[]) => (Math.atan2(poly[1]!.y - poly[0]!.y, poly[1]!.x - poly[0]!.x) * 180) / Math.PI

// 「押す」: 押したときの回す量（度）だけ、重心まわりに回す（rotateOutline と同じ中心）
function pressAlignRoad(poly: readonly Point[], roadDeg: number): Point[] {
  const pivot = outlineCentroid(poly)!
  return rotateFootprint(poly, pivot, alignRoadDegOf(poly, roadDeg))
}

describe('道路に平行に合わせる（仕様 AL1〜AL3）', () => {
  it('仕様 AL1: 押すと、外形の最初の辺が道路の向きに平行になる', () => {
    const after = pressAlignRoad(OUTLINE, ROAD_DEG)
    const diff = ((edgeDegOf(after) - ROAD_DEG) % 180 + 180) % 180
    expect(Math.min(diff, 180 - diff)).toBeLessThan(1e-6)
  })

  it('仕様 AL2: 回す中心は外形の重心。重心は動かない', () => {
    const before = outlineCentroid(OUTLINE)!
    const after = pressAlignRoad(OUTLINE, ROAD_DEG)
    const centroid = outlineCentroid(after)!
    expect(centroid.x).toBeCloseTo(before.x, 3)
    expect(centroid.y).toBeCloseTo(before.y, 3)
  })

  it('仕様 AL3: もう一度押しても、もう回らない（回す量は 0）', () => {
    const once = pressAlignRoad(OUTLINE, ROAD_DEG)
    expect(Math.abs(alignRoadDegOf(once, ROAD_DEG))).toBeLessThan(1e-6)
  })
})
