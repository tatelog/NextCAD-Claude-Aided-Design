// 代表の二方向動線・共用部最適配置要件。ツインの片側の端部が欠けても、反対側へ階段を置ける。
import {it,expect} from 'vitest'
import {arrangeCirculation} from './automaticCirculation'
import {generateAutoPlan} from './autoPlan'
import {masterOf} from './unitTypeMaster'
import candidates from './unitTypeCandidates.json'
import {viableUnitType} from './automaticUnitFit'
import {routeCovered} from './routeCoverage'
import {shaftContinuityIssues} from './shaftContinuity'
import {cellInsideOutline} from './units'
const types=masterOf(candidates).filter(t=>viableUnitType(t.id))
const base=()=>generateAutoPlan({unitTypes:types,unitTypeIds:types.map(t=>t.id),optimizeTypes:true,targetPerFloor:1,storeyCount:2,storeyHeightMm:3000,spanMm:3000,unitDepthMm:7400,corridorMm:1600,layout:'ツイン',evCount:1,evStops:[1,2],outline:{widthMm:26000,depthMm:66500}})
const full=[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500}]
function verifyPaths(p:ReturnType<typeof base>){
 const walking=[...p.corridors!,...p.bridges!,...p.cores.filter(c=>c.id!=='evHall')]
 expect(p.cells.length).toBeGreaterThan(0)
 expect(p.circulation!.routeMetrics!.every(m=>m.distinctDestinations)).toBe(true)
 for(const route of p.circulation!.routes){
  expect(routeCovered(route,walking,600)).toBe(true)
  expect(routeCovered(route.slice(1),walking,1600)).toBe(true)
  const end=route.at(-1)!
  expect(p.cores.filter(c=>c.id!=='evHall').some(c=>(end.x===c.x0||end.x===c.x1)&&end.y>c.y0&&end.y<c.y1)).toBe(true)
 }
}
it('東側の階段へ両廊下から端部の連絡通路を通って到達できる',()=>{
 const {plans}=arrangeCirculation(base(),[full,full],3,undefined,{rotateStairs:true,clusterElevator:true,elevatorEnd:0,stairSides:[1,1]})
 for(const p of Object.values(plans)){
  const east=p.corridors![1]!
  expect(p.cores.filter(c=>c.id!=='evHall').every(c=>c.x0===east.x1)).toBe(true)
  verifyPaths(p)
 }
 expect(shaftContinuityIssues(plans)).toEqual([])
},60000)
it('西側端部が欠ける外形では階段を東側へ振り分け、成立候補を拾う',()=>{
 const shape=[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:7000,y:66500},{x:7000,y:63500},{x:0,y:63500}]
 const {plans}=arrangeCirculation(base(),[shape,shape],3,undefined,{rotateStairs:true,clusterElevator:true})
 for(const p of Object.values(plans)){
  expect(p.cores.find(c=>c.id==='stairB')!.x0).toBe(p.corridors![1]!.x1)
  expect(p.cores.every(c=>cellInsideOutline(c,shape))).toBe(true)
  verifyPaths(p)
 }
 expect(shaftContinuityIssues(plans)).toEqual([])
},60000)
