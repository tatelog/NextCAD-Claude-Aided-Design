import {it,expect} from 'vitest'
import {resizeUnit} from './reshapeUnit'
import type {UnitPlan39} from './unitPlan39'
const p:UnitPlan39={id:'expand',type:'test',envelope:{W:4000,D:4000,balcony_depth:0},rooms:[{id:'r',name:'LDK',kind:'居室',x:0,y:0,w:4000,h:4000,area_m2:16}],doors:[{id:'e',kind:'玄関ドア',width:900,position:{orientation:'h',coord:0,start:1000}}],windows:[],fixtures:[],columns:[]}
it('指定した余白へ面積を拡張し入口幅を維持する',()=>{const r=resizeUnit(p,5000,5000);expect(r.valid).toBe(true);expect(r.plan.rooms[0]!.area_m2).toBe(25);expect(r.plan.doors[0]!.width).toBe(900)})
it('拡張でも水回りの幅と奥行を固定する',()=>{const q={...p,envelope:{...p.envelope,W:6000,D:6000},rooms:[{id:'b',name:'浴室',kind:'水回り',x:0,y:0,w:2000,h:2000,area_m2:4},{...p.rooms[0]!,x:2000,w:4000,h:6000,area_m2:24}]};const r=resizeUnit(q,7000,7000);expect(r.plan.rooms[0]!.w).toBeCloseTo(2000,1);expect(r.plan.rooms[0]!.h).toBeCloseTo(2000,1)})
