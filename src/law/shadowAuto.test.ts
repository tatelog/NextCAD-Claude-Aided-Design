import { describe, it, expect } from 'vitest'
import { shadowExposure } from './shadowDrawing'
import { useUi } from '../store/ui'
describe('躯体作成時の日影計算',()=>{
  it('日影表示は初期オン',()=>{expect(useUi.getInitialState().volumeShadow).toBe(true)})
  it('条例値なしでも地上の日影時間を計算できる',()=>{
    const result=shadowExposure({lot:[{x:0,y:0},{x:10000,y:0},{x:10000,y:10000},{x:0,y:10000}],buildings:[{footprint:[{x:2000,y:2000},{x:8000,y:2000},{x:8000,y:8000},{x:2000,y:8000}],heightMm:15000}],lat:35.67,lon:139.82,date:new Date('2026-12-22T00:00:00Z'),measurementHeightM:0})
    expect(result.cells.some(c=>c.hours>0)).toBe(true)
    expect(result.cells.every(c=>c.hours<=8)).toBe(true)
    expect(result).not.toHaveProperty('judgment')
  })
})
