// 仕様（統括の指示 2026-11-06。5c: 北の向きの検証）:
// 仕様 N1: 平面（planeOfLonLat）は、北へ動くと平面の y が増え、x は変わらない（平面の +y は真北）。
// 仕様 N2: 東へ動くと平面の x が増え、y は変わらない（平面の +x は東）。
// 仕様 N3: 真北の向き（PLANE_TRUE_NORTH）は、北へ動く向き（単位長さ）と一致する。北側斜線に渡す真北はこれ。
// 仕様 N4: 真北を渡すと、低層住専の敷地の北の辺に北側斜線が付く（立ち上がり 5 m、係数 1.25、内側へ向く）。
import { describe, expect, it } from 'vitest'
import { legalBoundaries } from '../volume/legalSlope'
import { DUMMY_PARCEL } from '../plan/dummyParcel'
import { parcelFrameOf, planeOfLonLat, PLANE_TRUE_NORTH } from './parcelPlane'

const CENTER = { lon: 139.8, lat: 35.65 }
const PARCEL = {
  type: 'Polygon',
  coordinates: [
    [
      [139.7999, 35.6499],
      [139.8001, 35.6499],
      [139.8001, 35.6501],
      [139.7999, 35.6501],
      [139.7999, 35.6499],
    ],
  ],
}
const STEP = 1e-4 // 約 11 m

describe('平面の向き（仕様 N1〜N3）', () => {
  const frame = parcelFrameOf(PARCEL)!
  const origin = planeOfLonLat(frame, CENTER.lon, CENTER.lat)

  it('仕様 N1: 北へ動くと、平面の y が増え、x は変わらない', () => {
    const north = planeOfLonLat(frame, CENTER.lon, CENTER.lat + STEP)
    expect(north.x - origin.x).toBeCloseTo(0, 6)
    expect(north.y - origin.y).toBeGreaterThan(0)
  })

  it('仕様 N2: 東へ動くと、平面の x が増え、y は変わらない', () => {
    const east = planeOfLonLat(frame, CENTER.lon + STEP, CENTER.lat)
    expect(east.x - origin.x).toBeGreaterThan(0)
    expect(east.y - origin.y).toBeCloseTo(0, 6)
  })

  it('仕様 N3: 真北の向き（PLANE_TRUE_NORTH）は、北へ動く向き（単位長さ）と一致する', () => {
    const north = planeOfLonLat(frame, CENTER.lon, CENTER.lat + STEP)
    const dx = north.x - origin.x
    const dy = north.y - origin.y
    const len = Math.hypot(dx, dy)
    expect(dx / len).toBeCloseTo(PLANE_TRUE_NORTH.x, 9)
    expect(dy / len).toBeCloseTo(PLANE_TRUE_NORTH.y, 9)
    expect(Math.hypot(PLANE_TRUE_NORTH.x, PLANE_TRUE_NORTH.y)).toBeCloseTo(1, 12)
  })
})

describe('北側斜線（仕様 N4）', () => {
  it('仕様 N4: 低層住専で真北を渡すと、北の辺（y が最も大きい頂点）に、内側（南）へ向く北側斜線が付く', () => {
    const legal = legalBoundaries({
      footprint: DUMMY_PARCEL,
      roadEdgeIndex: 0,
      roadWidthMm: 6_000,
      zone: '低層住専',
      farPercent: 100,
      trueNorth: PLANE_TRUE_NORTH,
    })
    const north = legal.boundaries.filter((b) => b.kind === 'north')
    expect(north).toHaveLength(1)
    expect(north[0]!.point.y).toBeCloseTo(30_000, 6)
    expect(north[0]!.inward.x).toBeCloseTo(0, 9)
    expect(north[0]!.inward.y).toBeCloseTo(-1, 9)
    expect(north[0]!.coefficient).toBe(1.25)
    expect(north[0]!.riseMm).toBe(5_000)
  })
})
