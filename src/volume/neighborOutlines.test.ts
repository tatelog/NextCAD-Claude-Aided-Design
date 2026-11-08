// 仕様（統括の依頼 2026-11-06。5: 2D の作図画面に、筆の点線に加えて周辺建物の輪郭を敷く。描いたボリュームと周辺建物がずれない）:
// 仕様 5a: 周辺建物の輪郭は、確定した筆と同じ枠で平面にする（筆の頂点と同じ経緯度の輪郭は、筆の頂点と 1 mm 以内で一致する）。
// 仕様 5b: 高さが不明の建物の輪郭は出さない。
// 仕様 5c: 筆の枠が無い（筆が無い確定）ときは、輪郭を出さない。
import { describe, expect, it } from 'vitest'
import type { Point } from '../geom/viewport'
import { parcelFrameOf, parcelRingOf } from '../map/parcelPlane'
import type { PlateauBuilding } from '../plateau/bldg'
import { neighborOutlinesOf } from './neighborFrame'

const LON0 = 139.83
const LAT0 = 35.67
const PARCEL: [number, number][] = [
  [LON0, LAT0],
  [LON0 + 0.001, LAT0],
  [LON0 + 0.001, LAT0 + 0.001],
  [LON0, LAT0 + 0.001],
]
const geometry = { type: 'Polygon', coordinates: [[...PARCEL, PARCEL[0]]] }
const bld = (heightM: number | null): PlateauBuilding => ({
  id: 'b',
  heightM,
  storeys: 3,
  footprints: [PARCEL.map(([lon, lat]) => ({ lat, lon }))],
})
const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) <= 1

describe('2D の周辺建物の輪郭（仕様 5a〜5c）', () => {
  it('仕様 5a: 輪郭は筆と同じ枠で載り、筆の頂点と 1 mm 以内で一致する', () => {
    const frame = parcelFrameOf(geometry)
    const ring = parcelRingOf(geometry)!
    const outlines = neighborOutlinesOf([bld(10)], frame)
    expect(outlines.length).toBe(1)
    for (const p of outlines[0]!) expect(ring.some((q) => near(p, q))).toBe(true)
  })

  it('仕様 5b: 高さが不明の建物の輪郭は出さない', () => {
    expect(neighborOutlinesOf([bld(null)], parcelFrameOf(geometry))).toEqual([])
  })

  it('仕様 5c: 筆の枠が無いときは、輪郭を出さない', () => {
    expect(neighborOutlinesOf([bld(10)], null)).toEqual([])
  })
})
