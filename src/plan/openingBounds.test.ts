import {it,expect} from 'vitest'
import {validateUnitLayout} from './reshapeUnit'
import type {UnitPlan39} from './unitPlan39'
const plan:UnitPlan39={id:'opening',type:'test',envelope:{W:4000,D:4000,balcony_depth:0},rooms:[{id:'r',name:'LDK',kind:'居室',x:0,y:0,w:4000,h:4000,area_m2:16}],doors:[],fixtures:[],windows:[],columns:[]}
it('開口中心が壁上でも開口端が外形を越えた案は不採用',()=>{
 const p={...plan,doors:[{id:'e',kind:'玄関ドア',width:900,position:{orientation:'h' as const,coord:0,start:-200}}]}
 expect(validateUnitLayout(p).some(i=>i.code==='door-outside')).toBe(true)
})
it('開口全体が外形内に収まる玄関は許可',()=>{
 const p={...plan,doors:[{id:'e',kind:'玄関ドア',width:900,position:{orientation:'h' as const,coord:0,start:200}}]}
 expect(validateUnitLayout(p).some(i=>i.code==='door-outside')).toBe(false)
})
