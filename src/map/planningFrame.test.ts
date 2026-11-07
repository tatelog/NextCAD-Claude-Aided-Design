import { describe, expect, it } from 'vitest'
import { alignEdgeAngle, rotatePlanPoint, withPlanningAngle } from './planningFrame'
import { polygonAreaMm2 } from '../geom/polygon'
import { planeOfLonLat } from './parcelPlane'
import { parseSaveData } from '../app/loadData'

describe('計画の基準面', () => {
  const lot = [{ x: 0, y: 0 }, { x: 3000, y: 4000 }, { x: -1000, y: 7000 }]
  it('指定辺を水平にし、面積と長さを保つ', () => {
    const angle = alignEdgeAngle(lot, 0)
    const moved = lot.map((p) => rotatePlanPoint(p, angle))
    expect(moved[1]!.y).toBeCloseTo(moved[0]!.y)
    expect(moved[1]!.x - moved[0]!.x).toBeCloseTo(5000)
    expect(polygonAreaMm2(moved)).toBeCloseTo(polygonAreaMm2(lot))
  })
  it('角度を設定し直しても回転が累積しない', () => {
    const base = { lot, frame: { lon0: 0, lat0: 0, kx: 1, ky: 1, cx: 0, cy: 0 } }
    const back = withPlanningAngle(withPlanningAngle(base, 90), 0)
    back.lot!.forEach((p, i) => { expect(p.x).toBeCloseTo(lot[i]!.x); expect(p.y).toBeCloseTo(lot[i]!.y) })
  })
  it('周辺建物と地図にも同じ回転を適用する', () => {
    const frame = { lon0: 0, lat0: 0, kx: 1000, ky: 1000, cx: 0, cy: 0, rotationDeg: 90 }
    expect(planeOfLonLat(frame, 1, 0).x).toBeCloseTo(0)
    expect(planeOfLonLat(frame, 1, 0).y).toBeCloseTo(1000)
  })
  it('保存データから基準辺と向きを復元する', () => {
    const restored = parseSaveData({
      projectName: '基準面', savedAt: '2026-11-06T00:00:00Z', entries: [], storeyCount: 5, storeyHeightMm: 3000,
      confirmedSite: { parcelUid: 'test', lot, center: { lon: 139, lat: 35 }, roadEdge: 0, planningEdge: 2,
        frame: { lon0: 139, lat0: 35, kx: 1, ky: 1, cx: 0, cy: 0, rotationDeg: 90 } },
    })
    expect(restored.confirmedSite?.planningEdge).toBe(2)
    expect(restored.confirmedSite?.frame?.rotationDeg).toBe(90)
  })
})
