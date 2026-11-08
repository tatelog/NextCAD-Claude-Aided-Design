import {it,expect} from 'vitest'
import {clearEntry} from './entryClearance'
import type {UnitPlan39} from './unitPlan39'
import {validateUnitLayout} from './reshapeUnit'
it('共用廊下を塞がない内開きにしPSを通行検証済みの壁際へ寄せる',()=>{
 const p:UnitPlan39={id:'test',type:'test',envelope:{W:4000,D:4000,balcony_depth:0},rooms:[{id:'entry',name:'玄関',kind:'玄関',x:0,y:0,w:4000,h:4000,area_m2:16}],doors:[{id:'door',kind:'玄関ドア',width:900,swing_into:'entry',position:{orientation:'h',coord:0,start:1500}}],windows:[],columns:[],fixtures:[{id:'ps',kind:'PS',x:1700,y:1200,w:600,h:600}]}
 const result=clearEntry(p)
 expect(result.doors[0]?.swing_into).toBe('entry')
 expect(result.fixtures[0]).toMatchObject({x:0,y:0,w:600,h:600})
 expect(validateUnitLayout(result)).toEqual([])
 expect(p.fixtures[0]?.x).toBe(1700)
 expect(clearEntry(result)).toEqual(result)
})

