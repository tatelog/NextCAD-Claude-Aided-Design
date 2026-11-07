import {describe,it,expect} from 'vitest'
import {reshapeUnit,validateUnitLayout} from './reshapeUnit'
import type {UnitPlan39} from './unitPlan39'
const p:UnitPlan39={id:'wet',type:'test',envelope:{W:6000,D:6000,balcony_depth:0},rooms:[{id:'bath',name:'浴室',kind:'水回り',x:0,y:0,w:2000,h:2000,area_m2:4},{id:'living',name:'LDK',kind:'居室',x:2000,y:0,w:4000,h:6000,area_m2:24},{id:'bed',name:'洋室',kind:'居室',x:0,y:2000,w:2000,h:4000,area_m2:8}],fixtures:[],doors:[],windows:[],columns:[]}
describe('水回り固定と使用スペース',()=>{
 it('浴室寸法を固定し共有する間仕切りを動かす',()=>{const r=reshapeUnit(p,7200).plan;expect(r.rooms[0]!.w).toBeCloseTo(2000,1);expect(r.rooms[0]!.h).toBeCloseTo(2000,1);expect(r.rooms[1]!.x).toBeCloseTo(2000,1);expect(r.rooms[1]!.w).toBeCloseTo(5200,1);expect(r.envelope.D).toBe(5000)})
 it('部屋の面積合計を維持して隙間を作らない',()=>{const r=reshapeUnit(p,7200).plan;expect(r.rooms.reduce((s,r)=>s+r.w*r.h,0)).toBeCloseTo(36000000,0)})
 it('水回りが外形より大きいと不成立',()=>{expect(reshapeUnit(p,19000).valid).toBe(false)})
 it('家具は重ならなくても使用スペース不足を検出',()=>{const q:UnitPlan39={...p,envelope:{W:2100,D:2100,balcony_depth:0},rooms:[{id:'r',name:'洋室',kind:'居室',x:0,y:0,w:2100,h:2100,area_m2:4.41}],fixtures:[{id:'b',kind:'ベッド',x:50,y:50,w:2000,h:2000}]};expect(validateUnitLayout(q).some(i=>i.code==='usage-space')).toBe(true)})
})
