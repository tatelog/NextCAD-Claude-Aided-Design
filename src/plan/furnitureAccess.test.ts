// 代表の室内動線要件: 使用余白が空いているだけでは不可。玄関からその余白へ到達できること。
import {it,expect} from 'vitest'
import {validateUnitLayout} from './reshapeUnit'
import type {UnitPlan39} from './unitPlan39'
const unit:UnitPlan39={id:'furniture-access',type:'test',envelope:{W:4000,D:4000,balcony_depth:0},rooms:[{id:'storage',name:'納戸',kind:'収納',x:0,y:0,w:4000,h:4000,area_m2:16}],doors:[{id:'entry',kind:'玄関ドア',width:900,position:{orientation:'h',coord:0,start:1500}}],fixtures:[{id:'divider',kind:'収納',x:0,y:1200,w:4000,h:600},{id:'bed',kind:'ベッド',x:2000,y:2000,w:1000,h:2000}],windows:[],columns:[]}
it('用途名にかかわらず、家具脇に空きがあっても玄関から到達できなければ拒否する',()=>{
 expect(validateUnitLayout(unit).some(i=>i.code==='usage-unreachable'&&i.message.includes('ベッド'))).toBe(true)
})
it('一方の使用余白が孤立していても、別の利用可能な側まで通れれば使用可能',()=>{
 const p={...unit,fixtures:[{...unit.fixtures[0]!,w:3000},unit.fixtures[1]!]}
 expect(validateUnitLayout(p).filter(i=>i.code==='usage-unreachable')).toEqual([])
})
it('PSは人が使用する家具の余白判定に含めない',()=>{
 const p={...unit,fixtures:[unit.fixtures[0]!,{...unit.fixtures[1]!,kind:'PS'}]}
 expect(validateUnitLayout(p).filter(i=>i.code==='usage-unreachable')).toEqual([])
})
