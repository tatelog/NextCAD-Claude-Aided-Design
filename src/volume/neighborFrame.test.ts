// 仕様（統括の依頼 2026-11-06。2: 周辺建物は、確定した筆の中心の緯度経度を基準に、筆と重なる位置に置く）:
// 仕様 2a: 筆の中にある建物は、筆の平面の中に来る。
// 仕様 2b: 建物の頂点の経緯度は、筆の枠で平面にすると、同じ経緯度の筆の頂点と 1 mm 以内で一致する（ずれない）。
// 仕様 2c: 高さが不明の建物は、今までどおり出さない。
import { describe, expect, it } from 'vitest'
import type { Point } from '../geom/viewport'
import { parcelFrameOf, parcelRingOf } from '../map/parcelPlane'
import type { PlateauBuilding } from '../plateau/bldg'
import { neighborVolumesInFrame } from './neighborFrame'

const LON0 = 139.83
const LAT0 = 35.67
const PARCEL_LONLAT: [number, number][] = [
  [LON0, LAT0],
  [LON0 + 0.001, LAT0],
  [LON0 + 0.001, LAT0 + 0.001],
  [LON0, LAT0 + 0.001],
]
const geometry = { type: 'Polygon', coordinates: [[...PARCEL_LONLAT, PARCEL_LONLAT[0]]] }
const bld = (heightM: number | null, pts: [number, number][]): PlateauBuilding => ({
  id: 'b',
  heightM,
  storeys: 3,
  footprints: [pts.map(([lon, lat]) => ({ lat, lon }))],
})
const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) <= 1

describe('確定した筆の枠で置く周辺建物（仕様 2a〜2c）', () => {
  it('仕様 2a: 筆の中の建物は、筆の平面の中に来る', () => {
    const frame = parcelFrameOf(geometry)!
    const ring = parcelRingOf(geometry)!
    const [v] = neighborVolumesInFrame([bld(10, [[LON0 + 0.0002, LAT0 + 0.0002], [LON0 + 0.0004, LAT0 + 0.0002], [LON0 + 0.0004, LAT0 + 0.0004]])], frame)
    const xs = ring.map((p) => p.x)
    const ys = ring.map((p) => p.y)
    for (const p of v!.footprint) {
      expect(p.x).toBeGreaterThan(Math.min(...xs))
      expect(p.x).toBeLessThan(Math.max(...xs))
      expect(p.y).toBeGreaterThan(Math.min(...ys))
      expect(p.y).toBeLessThan(Math.max(...ys))
    }
  })

  it('仕様 2b: 建物の頂点は、同じ経緯度の筆の頂点と 1 mm 以内で一致する', () => {
    const frame = parcelFrameOf(geometry)!
    const ring = parcelRingOf(geometry)!
    const [v] = neighborVolumesInFrame([bld(10, PARCEL_LONLAT)], frame)
    for (const p of v!.footprint) {
      expect(ring.some((q) => near(p, q))).toBe(true)
    }
  })

  it('仕様 2c: 高さが不明の建物は出さない', () => {
    const frame = parcelFrameOf(geometry)!
    expect(neighborVolumesInFrame([bld(null, PARCEL_LONLAT)], frame)).toEqual([])
  })
})
