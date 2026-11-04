// 仕様: 周辺建物を、P2 の 3D の座標（mm、敷地の中心を基準）に置く。
// 仕様 1: 基準点（P1 の地点）が敷地の中心に来るように平行移動する。方角は保つ（x が東、y が北）。
// 仕様 2: 計測高さ（m）を mm にして高さとする。高さが不明（null）の建物は表示しない（高さを推測で入れない）。
// 仕様 3: 底面が複数ある建物は、底面ごとに別の立体として返す。
import { describe, expect, it } from 'vitest'
import { neighborVolumes } from './neighborLocal'
import type { PlateauBuilding } from '../plateau/bldg'

const origin = { lat: 35.673094, lon: 139.860149 }
const center = { x: 10_000, y: 15_000 }

const at = (id: string, dLat: number, dLon: number, heightM: number | null): PlateauBuilding => ({
  id,
  heightM,
  storeys: 1,
  footprints: [
    [
      { lat: origin.lat + dLat, lon: origin.lon + dLon },
      { lat: origin.lat + dLat, lon: origin.lon + dLon + 0.0001 },
      { lat: origin.lat + dLat + 0.0001, lon: origin.lon + dLon + 0.0001 },
      { lat: origin.lat + dLat + 0.0001, lon: origin.lon + dLon },
    ],
  ],
})

describe('neighborVolumes（周辺建物を P2 の座標へ）', () => {
  it('基準点は敷地の中心に来る（建物の最初の頂点が基準点の場合）', () => {
    const [v] = neighborVolumes([at('here', 0, 0, 10)], origin, center)
    // 底面の最初の頂点は基準点そのもの。平面の方角の差で、他の頂点は中心からずれる
    expect(v!.footprint[0]!.x).toBeCloseTo(center.x, 0)
    expect(v!.footprint[0]!.y).toBeCloseTo(center.y, 0)
  })

  it('北へずれた建物は y が大きく、東へずれた建物は x が大きい', () => {
    const [north, east] = neighborVolumes([at('north', 0.001, 0, 10), at('east', 0, 0.001, 10)], origin, center)
    const cy = (v: { footprint: { x: number; y: number }[] }) => v.footprint.reduce((s, p) => s + p.y, 0) / v.footprint.length
    const cx = (v: { footprint: { x: number; y: number }[] }) => v.footprint.reduce((s, p) => s + p.x, 0) / v.footprint.length
    expect(cy(north!)).toBeGreaterThan(center.y + 100_000)
    expect(cx(east!)).toBeGreaterThan(center.x + 80_000)
  })

  it('高さを mm にして返す', () => {
    const [v] = neighborVolumes([at('h', 0, 0, 10.6)], origin, center)
    expect(v!.heightMm).toBe(10_600)
  })

  it('高さが不明（null）の建物は返さない', () => {
    expect(neighborVolumes([at('unknown', 0, 0, null)], origin, center)).toEqual([])
  })

  it('底面が複数あれば、底面ごとに別の立体になる', () => {
    const b: PlateauBuilding = {
      ...at('two', 0, 0, 4),
      footprints: [at('a', 0, 0, 4).footprints[0]!, at('b', 0.0005, 0, 4).footprints[0]!],
    }
    expect(neighborVolumes([b], origin, center)).toHaveLength(2)
  })
})
