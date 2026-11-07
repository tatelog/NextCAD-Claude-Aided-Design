import {it,expect} from 'vitest'
import {validateUnitLayout} from './reshapeUnit'
import type {UnitPlan39} from './unitPlan39'
const p:UnitPlan39={id:'routes',type:'test',envelope:{W:4000,D:6000,balcony_depth:0},rooms:[{id:'a',name:'LDK',kind:'居室',x:0,y:0,w:4000,h:3000,area_m2:12},{id:'b',name:'寝室',kind:'居室',x:0,y:3000,w:4000,h:3000,area_m2:12}],doors:[{id:'entry',kind:'玄関ドア',width:900,position:{orientation:'h',coord:0,start:1500}},{id:'balcony',kind:'引戸',width:900,position:{orientation:'h',coord:6000,start:1500}}],fixtures:[],windows:[],columns:[]}
it('バルコニー側開口だけに通じる寝室は玄関から到達可能と扱わない',()=>{
 expect(validateUnitLayout(p).some(i=>i.code==='unreachable'&&i.message.includes('寝室'))).toBe(true)
})
it('寝室が内扉で玄関側へ通じていれば到達可能',()=>{
 const connected={...p,doors:[...p.doors,{id:'inner',kind:'引戸',width:900,position:{orientation:'h' as const,coord:3000,start:1500}}]}
 expect(validateUnitLayout(connected).filter(i=>i.code==='unreachable')).toEqual([])
})

it('洗面脱衣室も玄関から到達できなければ採用しない',()=>{
 const isolated={...p,rooms:[p.rooms[0]!,{...p.rooms[1]!,name:'洗面脱衣',kind:'水回り'}]}
 expect(validateUnitLayout(isolated).some(i=>i.code==='unreachable'&&i.message.includes('洗面脱衣'))).toBe(true)
 const connected={...isolated,doors:[...isolated.doors,{id:'wash-door',kind:'引戸',width:900,position:{orientation:'h' as const,coord:3000,start:1500}}]}
 expect(validateUnitLayout(connected).filter(i=>i.code==='unreachable')).toEqual([])
})
