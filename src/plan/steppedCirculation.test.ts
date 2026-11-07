import {masterOf} from './unitTypeMaster'
import candidates from './unitTypeCandidates.json'
import {viableUnitType} from './automaticUnitFit'
const types=masterOf(candidates).filter(t=>viableUnitType(t.id))
import {it,expect} from 'vitest'
import {arrangeCirculation} from './automaticCirculation'
import {generateAutoPlan} from './autoPlan'
import {cellInsideOutline} from './units'
import {shaftContinuityIssues} from './shaftContinuity'
const base=()=>generateAutoPlan({unitTypes:types,unitTypeIds:types.map(t=>t.id),optimizeTypes:true,targetPerFloor:1,storeyCount:3,storeyHeightMm:3000,spanMm:3000,unitDepthMm:7400,corridorMm:1600,layout:'中廊下',evCount:1,evStops:[1,2,3],outline:{widthMm:26000,depthMm:66500}})
const full=[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500}]
it('上階の外周欠けが住戸だけにかかる場合も、採用する住戸と縦シャフトの整合を保つ',()=>{
 // 中央の外壁側を欠き、階段・EV・共用廊下は残す。
 const upper=[{x:0,y:0},{x:26000,y:0},{x:26000,y:25000},{x:15000,y:25000},{x:15000,y:40000},{x:26000,y:40000},{x:26000,y:66500},{x:0,y:66500}]
 const plans=arrangeCirculation(base(),[full,full,upper],3,undefined,{rotateStairs:true,clusterElevator:true}).plans
 expect(plans[3]!.cells.length).toBeGreaterThan(0)
 expect(plans[3]!.cells.length).toBeLessThan(plans[1]!.cells.length)
 expect(plans[3]!.cells.every(c=>cellInsideOutline(c,upper))).toBe(true)
 expect(shaftContinuityIssues(plans)).toEqual([])
},60000)
it('上階で廊下が途切れる外形は成立扱いにしない',()=>{
 const clipped=[{x:0,y:0},{x:9000,y:0},{x:9000,y:66500},{x:0,y:66500}]
 expect(()=>arrangeCirculation(base(),[full,full,clipped],3,undefined,{rotateStairs:true,clusterElevator:true})).toThrow('全階を連続する廊下')
})
it('住戸詳細の割当がない空の階を成立として返さない',()=>{
 const empty={...base(),unitTypeIdsByCell:{}}
 expect(()=>arrangeCirculation(empty,[full,full,full],3,undefined,{rotateStairs:true,clusterElevator:true})).toThrow('配置できる住戸がありません')
},60000)
it('両端で収まる側が異なる外形では左右別々に階段を配置する',()=>{
 const shape=[{x:8000,y:0},{x:26000,y:0},{x:26000,y:30000},{x:18000,y:30000},{x:18000,y:66500},{x:0,y:66500},{x:0,y:35000},{x:8000,y:35000}]
 const p=arrangeCirculation(base(),[shape,shape,shape],3,undefined,{rotateStairs:true,clusterElevator:true}).plans[1]!
 const a=p.cores.find(c=>c.id==='stairA')!,b=p.cores.find(c=>c.id==='stairB')!
 expect(a.x0).toBe(p.corridor.x1)
 expect(b.x1).toBe(p.corridor.x0)
 expect(p.cells.length).toBeGreaterThan(0)
 expect(p.circulation!.routes.length).toBe(p.cells.length*2)
 expect(p.circulation!.routeMetrics!.every(r=>r.distinctDestinations)).toBe(true)
},60000)
it('一方の階段付近にEVが収まらなければ反対端へ集約する',()=>{
 const shape=[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500},{x:0,y:9000},{x:12000,y:9000},{x:12000,y:3000},{x:0,y:3000}]
 const p=arrangeCirculation(base(),[shape,shape,shape],3,undefined,{rotateStairs:true,clusterElevator:true}).plans[1]!
 const ev=p.cores.find(c=>c.id==='evHall')!,stair=p.cores.find(c=>c.id==='stairB')!
 expect(ev.y1).toBe(stair.y0)
 expect(cellInsideOutline(ev,shape)).toBe(true)
 expect(p.circulation!.elevatorRoutes).toHaveLength(p.cells.length)
 expect(p.cells.length).toBeGreaterThan(0)
},60000)
import {layoutMetrics} from './layoutQuality'
it('EV両端候補の住戸割付を比較し専有面積の大きい成立案を選ぶ',()=>{
 const options={rotateStairs:true,clusterElevator:true}
 const a=arrangeCirculation(base(),[full,full,full],3,undefined,{...options,elevatorEnd:0})
 const b=arrangeCirculation(base(),[full,full,full],3,undefined,{...options,elevatorEnd:1})
 expect(b.plans[1]!.cores.find(c=>c.id==='evHall')!.y1).toBe(b.plans[1]!.cores.find(c=>c.id==='stairB')!.y0)
 const selected=arrangeCirculation(base(),[full,full,full],3,undefined,options)
 expect(layoutMetrics(selected.plans).privateM2).toBeCloseTo(Math.max(layoutMetrics(a.plans).privateM2,layoutMetrics(b.plans).privateM2))
},60000)
