import { describe, expect, it } from 'vitest'
import { legalBoundaries } from './legalSlope'
import { slopeSheetsOf } from './slopeSurface'
const site = [{x:1000,y:2000},{x:11000,y:2000},{x:30000,y:22000},{x:-9000,y:22000}]
const road = (width: number) => legalBoundaries({footprint:site,roadEdgeIndex:0,roadWidthMm:width,zone:'住居系',farPercent:200}).boundaries.filter(b=>b.kind==='road')
describe('道路面の表示基準は選択した接道辺',()=>{
  it('敷地の奥が広くても、起点の両端と長さは接道辺に対応する',()=>{
    const low=slopeSheetsOf(road(6000),100000,15000,site)[0]!.filter(p=>p.hMm===0)
    expect(low.map(p=>p.x).sort((a,b)=>a-b)).toEqual([1000,11000])
    expect(low.every(p=>p.y===-4000)).toBe(true)
  })
  it('幅員を変えると対岸位置だけが移動し、接道長は変わらない',()=>{
    for(const width of [4000,8000]) {
      const low=slopeSheetsOf(road(width),100000,15000,site)[0]!.filter(p=>p.hMm===0)
      expect(Math.hypot(low[0]!.x-low[1]!.x,low[0]!.y-low[1]!.y)).toBe(10000)
      expect(low.every(p=>p.y===2000-width)).toBe(true)
    }
  })
  it('メッシュ表示範囲・建物高さを変えても起点と接道長を変えない',()=>{
    const low=(extent:number,height:number)=>slopeSheetsOf(road(6000),extent,height,site)[0]!.filter(p=>p.hMm===0)
    expect(low(50000,9000)).toEqual(low(150000,30000))
  })
})
