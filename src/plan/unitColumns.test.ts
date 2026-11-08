import {it,expect} from 'vitest'
import {arrangeColumns,columnObstructions} from './unitColumns'
import type {UnitPlan39} from './unitPlan39'
it('住戸ごとの柱移動をせず建物側の共通柱割りに委ねる',()=>{
 const p={id:'p',type:'p',envelope:{W:6000,D:6000,balcony_depth:0},rooms:[],fixtures:[],windows:[],doors:[{id:'e',kind:'玄関ドア',width:900,swing_into:'entry',position:{orientation:'h',coord:0,start:1500}}],columns:[{id:'c',x:1800,y:0}]} as UnitPlan39
 const r=arrangeColumns(p)
 expect(r.columns).toHaveLength(1)
 expect(r.columns).toEqual(p.columns)
 expect(columnObstructions(r)).toEqual(["c"])
 expect(p.columns[0]!.x).toBe(1800)
 expect(arrangeColumns(r)).toEqual(r)
})
