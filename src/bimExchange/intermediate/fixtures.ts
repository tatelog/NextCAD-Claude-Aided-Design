import type { PlanSnapshot } from './schema'
import type { FloorPlansSnapshot } from './autoPlanAdapter'

/** 架空の契約fixture。実案件データではない。 */
export function sampleSnapshot():PlanSnapshot {
  return {storeys:[{id:'floor-2',name:'2階',elevationMm:3000,heightMm:3000}],elements:[
    {id:'wall-2',kind:'wall',storeyId:'floor-2',footprint:{outer:[{x:0,y:0},{x:2000,y:0},{x:2000,y:1000},{x:0,y:1000}],holes:[[{x:100,y:100},{x:100,y:200},{x:200,y:200},{x:200,y:100}]]},baseOffsetMm:200,heightMm:2600,status:'estimated',source:{elementIds:['wall-source'],origin:'estimate'}},
    {id:'column-2',kind:'column',storeyId:'floor-2',footprint:null,baseOffsetMm:0,heightMm:null,status:'unresolved',source:{elementIds:['column-source'],origin:'plan'}},
  ]}
}
export function sampleFloorPlans():FloorPlansSnapshot {
  return {source:'synthetic-plan',storeys:[{floor:2,id:'floor-2',name:'2階',elevationMm:3000,heightMm:3000}],plans:{2:{
    widthMm:3000,depthMm:3000,spans:1,unitsPerFloor:1,shortfall:0,unitType:'単独',layout:'片廊下',stairFinish:null,shafts:{ps:0,eps:0,ds:0},
    ev:{storey_count:2,storey_height:3000,total_height:6000,storeys:[],ev_cores:[],unreachable_storeys:[]},
    corridor:{id:'corridor',x0:2000,y0:0,x1:3000,y1:3000},cells:[{id:'unit',x0:0,y0:0,x1:2000,y1:3000}],rooms:[],cores:[],shaftRects:[],spanTypes:[],unsupportedSpans:[],provisionalSpans:[],absorbedSpans:[],
    voids:[{id:'void-original',x0:1000,y0:1000,x1:2000,y1:2000}],
    balconies:[{id:'balcony-original',unitId:'unit',side:'右',depthMm:2000,x0:2000,y0:0,x1:4000,y1:3000,access:{x:2000,y0:0,y1:1000}}],
    unitPlanOverrides:{unit:{id:'unit-detail',type:'test',envelope:{W:3000,D:2000,balcony_depth:0},rooms:[],fixtures:[],doors:[{id:'door-original',kind:'玄関',width:900,position:{orientation:'h',coord:0,start:0}}],windows:[],columns:[{id:'column-original',x:0,y:0}]}}
  }}}
}

/** P5接続用の架空例。扉は所属壁付き、窓は実寸未指定の未解決例。 */
export function sampleHostedFloorPlans():FloorPlansSnapshot {
  const result=sampleFloorPlans(),u=result.plans[2]!.unitPlanOverrides!.unit!
  u.rooms=[{id:'room-a',name:'室A',kind:'居室',x:0,y:0,w:3000,h:1000,area_m2:3},{id:'room-b',name:'室B',kind:'居室',x:0,y:1000,w:3000,h:1000,area_m2:3}]
  u.doors=[{id:'door-hosted',kind:'室内戸',width:900,position:{orientation:'h',coord:1000,start:500}}]
  u.windows=[{id:'window-unresolved',room_id:'room-a',side:'N'}]
  result.detailDimensions={exteriorWallMm:200,partitionWallMm:115,doorHeightMm:2100,windowHeightMm:1200,windowSillMm:900}
  return result
}
