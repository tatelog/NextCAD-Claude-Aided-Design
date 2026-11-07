import {describe,it,expect} from 'vitest'
import {reshapeUnit,validateUnitLayout} from './reshapeUnit'
import type {UnitPlan39} from './unitPlan39'
const plan:UnitPlan39={id:'test',type:'test',envelope:{W:4000,D:4000,balcony_depth:0},rooms:[{id:'r',name:'LDK',kind:'居室',x:0,y:0,w:4000,h:4000,area_m2:16}],doors:[{id:'d',kind:'引戸',width:900,position:{orientation:'h',coord:0,start:1500}}],fixtures:[],windows:[],columns:[]}
describe('面積固定変形と動線',()=>{
 it('面積を維持し元データを変更しない',()=>{const r=reshapeUnit(plan,5000);expect(r.plan.envelope.D).toBe(3200);expect(r.plan.envelope.W*r.plan.envelope.D).toBe(16000000);expect(plan.envelope.W).toBe(4000)})
 it('設備を縮尺変更しない',()=>{const p={...plan,fixtures:[{id:'bed',kind:'ベッド',x:100,y:1200,w:1000,h:2000}]};const r=reshapeUnit(p,5000);expect(r.plan.fixtures[0]!.w*r.plan.fixtures[0]!.h).toBe(2000000)})
 it('入口を塞ぐ家具を検出する',()=>{const p={...plan,fixtures:[{id:'bed',kind:'ベッド',x:1400,y:0,w:1200,h:2000}]};expect(validateUnitLayout(p).some(x=>x.code==='door-blocked')).toBe(true)})
 it('部屋を横断する障害物で到達できない領域を検出する',()=>{const p={...plan,fixtures:[{id:'wall',kind:'収納',x:0,y:1500,w:4000,h:600}]};expect(validateUnitLayout(p).some(x=>x.code==='unreachable')).toBe(true)})
 it('トイレの設計寸法を満たさない場合に拒否する',()=>{const p={...plan,rooms:[{id:'wc',name:'WC',kind:'水回り',x:0,y:0,w:900,h:1700,area_m2:1.53}]};expect(validateUnitLayout(p).some(x=>x.code==='minimum-size')).toBe(true)})
 it('不正な寸法を拒否する',()=>{expect(()=>reshapeUnit(plan,0)).toThrow()})
})
