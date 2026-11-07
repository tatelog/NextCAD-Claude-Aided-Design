import {it,expect} from 'vitest'
import {validateUnitLayout} from './reshapeUnit'
import type {UnitPlan39} from './unitPlan39'
it('600mmの開口中央を通れる動線を格子の位相で拒否しない',()=>{
const p:UnitPlan39={id:'door',type:'door',envelope:{W:4000,D:4000,balcony_depth:0},rooms:[{id:'a',name:'廊下',kind:'廊下',x:0,y:0,w:1600,h:4000,area_m2:6.4},{id:'b',name:'洋室',kind:'居室',x:1600,y:0,w:2400,h:4000,area_m2:9.6}],doors:[{id:'entry',kind:'引戸',width:900,position:{orientation:'h',coord:0,start:350}},{id:'door',kind:'引戸',width:600,position:{orientation:'v',coord:1600,start:0}}],fixtures:[],windows:[],columns:[]};expect(validateUnitLayout(p)).toEqual([])
})
