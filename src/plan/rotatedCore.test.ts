import {masterOf} from './unitTypeMaster'
import candidates from './unitTypeCandidates.json'
import {viableUnitType} from './automaticUnitFit'
import {it,expect} from 'vitest'
import {arrangeCirculation} from './automaticCirculation'
import {generateAutoPlan} from './autoPlan'
it('短辺を廊下沿いにした階段とEV集約案を生成する',()=>{
 const types=masterOf(candidates).filter(t=>viableUnitType(t.id))
 const base=generateAutoPlan({unitTypes:types,unitTypeIds:types.map(t=>t.id),optimizeTypes:true,targetPerFloor:1,storeyCount:5,storeyHeightMm:3000,spanMm:3000,unitDepthMm:7400,corridorMm:1600,layout:'中廊下',evCount:1,evStops:[1,2,3,4,5],outline:{widthMm:26000,depthMm:66500}})
 const outline=[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500}]
 const p=arrangeCirculation(base,Array.from({length:5},()=>outline),3,undefined,{rotateStairs:true,clusterElevator:true}).plans[1]!
 const stair=p.cores.find(c=>c.id==='stairA')!,ev=p.cores.find(c=>c.id==='evHall')!
 expect(stair.x1-stair.x0).toBe(6000);expect(stair.y1-stair.y0).toBe(3000)
 expect(ev.y0).toBe(stair.y1)
 expect(p.circulation!.routes).toHaveLength(p.cells.length*2)
},60000)

import {prepareVolumePlan} from './volumePlan'
import {layoutMetrics} from './layoutQuality'
// 各条件を独立して判定し、一つの時間切れで他の配置結果を隠さない。
it.each((['中廊下','ツイン'] as const).flatMap(layout=>(['従来','回転集約'] as const).map(coreMode=>({layout,coreMode}))))('%jで住戸と共用部を配置する',({layout,coreMode})=>{
 const volume={footprint:[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500}],storey_count:5,storey_height:3000}
 const p=prepareVolumePlan(volume,[],{layout,span:3000,corridor:1600,unitDepth:7400,coreMode})
 expect(layoutMetrics(p.plans).units).toBeGreaterThan(0)
 expect(p.plans[1]!.cores.filter(c=>c.id==='stairA'||c.id==='stairB')).toHaveLength(2)
 expect(p.plans[5]!.cores).toEqual(p.plans[1]!.cores)
},60000)
