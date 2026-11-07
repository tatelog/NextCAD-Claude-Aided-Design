import {it,expect} from 'vitest'
import {generateAutoPlan} from './autoPlan'
import {applyUnitPlans} from './applyUnitPlans'
import {alignUnitStacks} from './alignUnitStacks'
import {shaftContinuityIssues} from './shaftContinuity'
import type {UnitPlan39} from './unitPlan39'
const outline=[{x:0,y:0},{x:10000,y:0},{x:10000,y:10000},{x:0,y:10000}]
function floor(depth:number,limit=10000){
 const detail:UnitPlan39={id:'test',type:'test',envelope:{W:4000,D:depth,balcony_depth:0},rooms:[{id:'r',name:'LDK',kind:'居室',x:0,y:0,w:4000,h:depth,area_m2:4000*depth/1e6}],doors:[{id:'e',kind:'玄関ドア',width:900,position:{orientation:'h',coord:0,start:1000}}],fixtures:[{id:'ps',kind:'PS',x:3500,y:depth-500,w:500,h:500}],windows:[],columns:[]}
 const p=generateAutoPlan({targetPerFloor:10,storeyCount:2,storeyHeightMm:3000,spanMm:3000,unitDepthMm:4000,corridorMm:1600,layout:'中廊下',evCount:0,evStops:[]})
 return applyUnitPlans({...p,widthMm:10000,depthMm:10000,cores:[],corridors:undefined,bridges:[],voids:[],corridor:{id:'c',x0:6000,x1:7600,y0:0,y1:10000},cells:[{id:'u',x0:6000-depth,x1:6000,y0:2000,y1:6000}],unitTypeIdsByCell:{u:'test'},unitPlanOverrides:{u:detail},buildingOutline:outline.map(v=>({...v,x:Math.min(v.x,limit)})),shaftRects:[]})
}
it('上下階に収まる最大の共通住戸候補でPSを揃える',()=>{
 const input={1:floor(5000),2:floor(4000)}
 const result=alignUnitStacks(input)
 expect(shaftContinuityIssues(result)).toEqual([])
 expect(result[1]!.cells[0]!.x0).toBe(1000)
 expect(result[2]!.cells[0]!.x0).toBe(1000)
 expect(input[2]!.cells[0]!.x0).toBe(2000)
})
it('上階外形に収まるPS配置を採り下階の専有面積は維持する',()=>{
 const upper=floor(4000);upper.buildingOutline=outline.map(v=>({...v,x:Math.max(v.x,2000)}))
 const result=alignUnitStacks({1:floor(5000),2:upper})
 expect(shaftContinuityIssues(result)).toEqual([])
 expect(result[1]!.cells[0]!.x0).toBe(1000)
 expect(result[2]!.cells[0]!.x0).toBe(2000)
})
it('途中階のない系統を黙って成立させない',()=>{
 const empty={...floor(4000),cells:[],shaftRects:[]}
 expect(shaftContinuityIssues(alignUnitStacks({1:empty,2:floor(4000)}))).not.toEqual([])
})
it('共通候補がコアに重なる場合は重ならない候補を探す',()=>{
 const upper=floor(4000);upper.cores=[{id:'stairA',x0:1000,x1:2000,y0:2000,y1:6000}]
 const result=alignUnitStacks({1:floor(5000),2:upper})
 expect(shaftContinuityIssues(result)).toEqual([])
 expect(result[1]!.cells[0]!.x0).toBe(1000)
 expect(result[2]!.cells[0]!.x0).toBe(2000)
})
it('室内動線が塞がる共通候補を採用しない',()=>{
 const input={1:floor(5000),2:floor(4000)}
 for(const p of Object.values(input))p.unitPlanOverrides!.u!.fixtures.push({id:'block',kind:'ベッド',x:0,y:0,w:4000,h:1500})
 expect(shaftContinuityIssues(alignUnitStacks(input))).not.toEqual([])
})
it('PSが候補と一致する階の広い住戸は縮めず、全階面積を確保する',()=>{
 const lower=floor(5000)
 lower.unitPlanOverrides!.u!.fixtures[0]!.y=3500
 const alignedLower=applyUnitPlans(lower)
 const upper=floor(3000);upper.buildingOutline=outline.map(v=>({...v,x:Math.max(v.x,2000)}))
 const result=alignUnitStacks({1:alignedLower,2:floor(4000),3:upper})
 expect(shaftContinuityIssues(result)).toEqual([])
 expect(result[1]!.cells[0]!.x0).toBe(1000)
 expect(result[2]!.cells[0]!.x0).toBe(2000)
 expect(result[3]!.cells[0]!.x0).toBe(2000)
})
it('共通PSを固定して下階の広い外形へ居室を再拡張する',()=>{
 const upper=floor(4000)
 upper.unitPlanOverrides!.u!.fixtures[0]!.y=3000
 upper.buildingOutline=outline.map(v=>({...v,x:Math.max(v.x,2000)}))
 const result=alignUnitStacks({1:floor(5000),2:applyUnitPlans(upper)})
 expect(shaftContinuityIssues(result)).toEqual([])
 expect(result[1]!.cells[0]!.x0).toBe(1000)
 expect(result[1]!.unitPlanOverrides!.u!.envelope.D).toBe(5000)
 expect(result[1]!.unitPlanOverrides!.u!.fixtures.find(f=>f.id==='ps')!.y).toBe(3000)
})
