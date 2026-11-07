import { expect, it } from 'vitest'
import { readUnitPlan, placeUnitPlan } from './unitPlan39'
import { roomFinishTotals } from '../estimate/roomQuantities'
it('1LDK-A の実寸と部屋を読む',()=>{const p=readUnitPlan('T-08-1LDK','A');expect(p?.envelope.W).toBe(7000);expect(p?.rooms).toHaveLength(7)})
it('廊下の左側に実寸で置き、元の面積を数量へ渡す',()=>{const p=placeUnitPlan('T-08-2LDK','A',{id:'L0',x0:0,x1:7400,y0:0,y1:8400},{x0:7400,x1:9000,y0:0,y1:30000});expect(p.status).toBe('ok');expect(p.rooms).toHaveLength(8);expect(roomFinishTotals(p.rooms,{storeyCount:1,ceilingHeightMm:2400}).floor.quantity).toBeCloseTo(62.16)})
it('区画の奥行が違う場合は伸縮せず拒否する',()=>{const p=placeUnitPlan('T-08-2LDK','A',{id:'L0',x0:0,x1:6000,y0:0,y1:8400},{x0:6000,x1:7600,y0:0,y1:30000});expect(p.status).toBe('寸法が合わない');expect(p.rooms).toEqual([])})

it('全13型のA/B/Cを読み、4LDK②には誤対応させない',()=>{
 for(const type of ['1R','1K','1DK','1LDK','2K','2DK','2LDK','3K','3DK','3LDK','4K','4DK','4LDK-1'])for(const v of ['A','B','C'])expect(readUnitPlan(`T-08-${type}`,v)?.rooms.length).toBeGreaterThan(0)
 expect(readUnitPlan('T-08-4LDK-2')).toBeNull()
})
