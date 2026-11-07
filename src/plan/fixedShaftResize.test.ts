import {it,expect} from 'vitest'
import {resizeUnit} from './reshapeUnit'
import type {UnitPlan39} from './unitPlan39'
const p:UnitPlan39={id:'fixed',type:'test',envelope:{W:4000,D:4000,balcony_depth:0},rooms:[{id:'r',name:'LDK',kind:'居室',x:0,y:0,w:4000,h:4000,area_m2:16}],doors:[{id:'e',kind:'玄関ドア',width:900,position:{orientation:'h',coord:0,start:1000}}],fixtures:[{id:'ps',kind:'PS',x:3000,y:3000,w:500,h:500}],windows:[],columns:[]}
it('PS固定で拡張しても設備座標と寸法を変えない',()=>{
 const r=resizeUnit(p,5000,5000,undefined,{fixShafts:true})
 expect(r.valid).toBe(true)
 expect(r.plan.fixtures.find(f=>f.id==='ps')).toEqual(p.fixtures[0])
 expect(r.plan.rooms[0]!.area_m2).toBeCloseTo(25)
})
it('固定PSが外形から出る縮小は不成立にする',()=>{
 expect(resizeUnit(p,3000,3000,undefined,{fixShafts:true}).valid).toBe(false)
})
it('外壁に接するPSを残して外壁だけ外側へ広げる',()=>{
 const source={...p,fixtures:[{...p.fixtures[0]!,x:3500,y:3500}]}
 const r=resizeUnit(source,5000,5000,undefined,{fixShafts:true})
 expect(r.valid).toBe(true)
 expect(r.plan.fixtures[0]).toEqual(source.fixtures[0])
 expect(r.plan.rooms[0]!.area_m2).toBeCloseTo(25)
})
it('外壁際PSを含む外形をPS端より内側へ縮めない',()=>{
 const source={...p,fixtures:[{...p.fixtures[0]!,x:3500,y:3500}]}
 expect(resizeUnit(source,3800,4000,undefined,{fixShafts:true}).valid).toBe(false)
})
