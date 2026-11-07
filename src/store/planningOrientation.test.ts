import { describe, it, expect } from 'vitest'
import { useConfirmedSite } from './confirmedSite'
import { useDrawing, type StrokeEntry } from './drawing'
import { alignPlanningEdge } from './planningOrientation'

describe('道路辺を基準方向に確定', () => {
  it('敷地と描画履歴を同じ座標へ移し、再選択でも回転が累積しない', () => {
    useConfirmedSite.getState().confirm({parcelUid:'test',lot:[{x:0,y:0},{x:3000,y:4000},{x:0,y:6000}],frame:{lon0:0,lat0:0,kx:1,ky:1,cx:0,cy:0},center:{lat:0,lon:0},roadEdge:0,roadWidthMm:6000,roadSource:'数値指定'})
    const e = {nodes:[{id:'n',x:1500,y:2000}],segments:[],stroke:{}} as unknown as StrokeEntry
    useDrawing.setState({entries:[e],past:[[e]],redoStack:[[e]]})
    alignPlanningEdge(0)
    const site=useConfirmedSite.getState().confirmed!
    expect(site.lot![1]!.y).toBeCloseTo(0)
    expect(site.planningEdge).toBe(0)
    for(const entries of [useDrawing.getState().entries,...useDrawing.getState().past,...useDrawing.getState().redoStack]) {
      expect(entries[0]!.nodes[0]!.x).toBeCloseTo(2500)
      expect(entries[0]!.nodes[0]!.y).toBeCloseTo(0)
    }
    alignPlanningEdge(0)
    expect(useConfirmedSite.getState().confirmed!.frame!.rotationDeg).toBeCloseTo(site.frame!.rotationDeg!)
  })
})

