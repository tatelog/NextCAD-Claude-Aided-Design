import {it,expect} from 'vitest'
import {reshapeUnit,validateUnitLayout} from './reshapeUnit'
import {readUnitPlan} from './unitPlan39'
it('部屋内でベッドと収納を再配置し使用余白と入口を両立する',()=>{
const p={id:'room',type:'room',envelope:{W:3200,D:2200,balcony_depth:0},rooms:[{id:'r',name:'洋室',kind:'居室',x:0,y:0,w:3200,h:2200,area_m2:7.04}],fixtures:[{id:'b',kind:'ベッド',x:200,y:200,w:1600,h:2000},{id:'c',kind:'クローゼット',x:2000,y:100,w:800,h:400}],doors:[{id:'d',kind:'引戸',width:800,position:{orientation:'v' as const,coord:3200,start:700}}],windows:[],columns:[]};
const r=reshapeUnit(p,3200);expect(r.valid,r.issues.map(i=>i.message).join('\n')).toBe(true);expect(validateUnitLayout(r.plan)).toEqual([]);expect(r.plan.fixtures).toHaveLength(2)
})
it('元案の扉の開く部屋と部屋コードを引き継ぐ',()=>{const p=readUnitPlan('4LDK-1','A')!;expect(p.doors.find(d=>d.id==='D03')).toHaveProperty('swing_into','R1');expect(p.rooms.find(r=>r.id==='BR1')).toHaveProperty('code','R1')})
