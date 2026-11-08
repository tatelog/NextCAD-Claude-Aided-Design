// 仕様（統括の依頼 2026-11-06。1: P1 で確定する敷地の、筆の枠）:
// 仕様 1a: 筆の枠で、筆の頂点の経緯度を平面（mm）にすると、筆の平面の頂点（parcelRingOf）と 1 mm 以内で一致する。
// 仕様 1b: 筆の中の経緯度は、平面でも筆の平面の中に入る（周辺建物を同じ枠で置いても、筆とずれない）。
import { describe, expect, it } from 'vitest'
import type { Point } from '../geom/viewport'
import { parcelFrameOf, parcelRingOf, planeOfLonLat } from './parcelPlane'

const LON0 = 139.83
const LAT0 = 35.67
const SQUARE_LONLAT = [
  [LON0, LAT0],
  [LON0 + 0.001, LAT0],
  [LON0 + 0.001, LAT0 + 0.001],
  [LON0, LAT0 + 0.001],
  [LON0, LAT0],
]
const geometry = { type: 'Polygon', coordinates: [SQUARE_LONLAT] }

const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) <= 1

describe('筆の枠（仕様 1a・1b）', () => {
  it('仕様 1a: 頂点の経緯度を枠で平面にすると、筆の平面の頂点と 1 mm 以内で一致する', () => {
    const frame = parcelFrameOf(geometry)
    const ring = parcelRingOf(geometry)
    expect(frame).not.toBeNull()
    expect(ring).not.toBeNull()
    for (const [lon, lat] of SQUARE_LONLAT) {
      const p = planeOfLonLat(frame!, lon!, lat!)
      expect(ring!.some((q) => near(p, q))).toBe(true)
    }
  })

  it('仕様 1b: 筆の中の経緯度は、平面でも筆の平面の中に入る', () => {
    const frame = parcelFrameOf(geometry)!
    const ring = parcelRingOf(geometry)!
    const inside = planeOfLonLat(frame, LON0 + 0.0005, LAT0 + 0.0005)
    const xs = ring.map((p) => p.x)
    const ys = ring.map((p) => p.y)
    expect(inside.x).toBeGreaterThan(Math.min(...xs))
    expect(inside.x).toBeLessThan(Math.max(...xs))
    expect(inside.y).toBeGreaterThan(Math.min(...ys))
    expect(inside.y).toBeLessThan(Math.max(...ys))
  })
})
