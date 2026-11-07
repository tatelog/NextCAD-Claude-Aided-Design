import {alignUnitStacks} from './alignUnitStacks'
import {remainingCoreSpace} from './coreCellSpace'
import {layoutPreference,preferLayout,type LayoutPreference} from './layoutPreference'
import {routePairMetrics} from './routePair'
import {shaftContinuityIssues} from './shaftContinuity'
import {routeCovered} from './routeCoverage'
import {placeUnitPlan} from './unitPlan39'
import {corridorForCell} from './planCorridors'
import {fitFloorUnitsAutomatically,type fitUnitAutomatically} from './automaticUnitFit'
import type {AutoPlan,AutoCore} from './autoPlan'
import type {Rect} from './candidateCells'
import {cellInsideOutline} from './units'

import {buildEvLevels} from './evLevels'
type Point={x:number;y:number}
export interface CirculationPlan {
 routeMetrics?:Array<ReturnType<typeof routePairMetrics>&{unitId:string}>;
 lobby:Rect; liftShafts:Rect[]; routes:Point[][]; elevatorRoutes?:Point[][]; residents:number; upperResidents:number;
 evCount:number; roundTripSeconds:number; intervalSeconds:number; capacityPerFiveMinutes:number;
 peoplePerUnit:number; populationOverride:boolean;
}
/** 初期検討用。住宅集中率4%のみメーカー資料を参照。他の定数はアプリの計画仮定。
 * https://www.mebs.co.jp/elevator/ssl/member/planning/traffic/
 * 9人乗り・乗車率80%・速度1m/s・停止ごと10秒・始発階20秒を仮定。
 * 住宅の平均運転間隔の目安: 1台90秒、複数台60秒。メーカー交通計算の代用ではない。
 */
export function estimateResidentialLifts(upperResidents:number,storeys:number,heightMm:number){
 if(!Number.isFinite(upperResidents)||upperResidents<0||!Number.isInteger(storeys)||storeys<1||!Number.isFinite(heightMm)||heightMm<=0)throw new Error('居住人数・階数・階高を確認してください')
 if(storeys===1)return {count:0,roundTripSeconds:0,intervalSeconds:0,capacityPerFiveMinutes:0}
 const roundTripSeconds=2*(storeys-1)*heightMm/1000+Math.min(storeys-1,8)*10+20
 let count=Math.max(1,Math.ceil(upperResidents*.04*roundTripSeconds/(300*9*.8)))
 if(roundTripSeconds/count>(count===1?90:60))count=Math.max(2,count,Math.ceil(roundTripSeconds/60))
 return {count,roundTripSeconds,intervalSeconds:roundTripSeconds/count,capacityPerFiveMinutes:count*300*9*.8/roundTripSeconds}
}
const inside=(r:Rect,outline:readonly Point[])=>outline.length>=3&&cellInsideOutline(r,outline)
const intersects=(a:Rect,b:Rect)=>Math.min(a.x1,b.x1)>Math.max(a.x0,b.x0)&&Math.min(a.y1,b.y1)>Math.max(a.y0,b.y0)
/** 廊下の接続を保ったまま、全階で共通のコアを予約する。収まらなければ成功にしない。 */
export function arrangeCirculation(base:AutoPlan,outlines:readonly (readonly Point[])[],peoplePerUnit:number,totalResidents?:number,options:{rotateStairs?:boolean;clusterElevator?:boolean;elevatorEnd?:0|1;stairSides?:readonly [-1|1,-1|1];recoverCoreSpace?:boolean;validatePlans?:(plans:Record<number,AutoPlan>)=>readonly string[]}={},unitFitCache=new Map<string,ReturnType<typeof fitUnitAutomatically>>()):{plans:Record<number,AutoPlan>} {
 if(options.recoverCoreSpace===undefined){
  let best:{plans:Record<number,AutoPlan>}|undefined,score:LayoutPreference|undefined,lastError:unknown
  for(const recoverCoreSpace of [false,true]){try{
   const result=arrangeCirculation(base,outlines,peoplePerUnit,totalResidents,{...options,recoverCoreSpace},unitFitCache)
   const candidateScore=layoutPreference(result.plans)
   if(!score||preferLayout(candidateScore,score)){best=result;score=candidateScore}
  }catch(error){lastError=error}}
  if(best)return best
  throw lastError??new Error('コア脇の住戸配置を確保できません')
 }
 if(options.clusterElevator&&options.elevatorEnd===undefined){
  let best:{plans:Record<number,AutoPlan>}|undefined,score:LayoutPreference|undefined,lastError:unknown
  for(const elevatorEnd of [0,1] as const){try{
   const result=arrangeCirculation(base,outlines,peoplePerUnit,totalResidents,{...options,elevatorEnd},unitFitCache)
   const area=layoutPreference(result.plans)
   if(!score||preferLayout(area,score)){best=result;score=area}
  }catch(error){lastError=error}}
  if(best)return best
  throw lastError??new Error('両端の階段付近にEVを集約できません')
 }
 if(!Number.isFinite(peoplePerUnit)||peoplePerUnit<=0||(totalResidents!==undefined&&(!Number.isFinite(totalResidents)||totalResidents<=0)))throw new Error('想定居住人数を正の数で入力してください')
 if(base.layout==='階段室')throw new Error('この廊下形式の共用動線の自動配置は未対応です。中廊下または片廊下を選択してください。')
 const stairDepth=options.rotateStairs?6000:3000,stairLength=options.rotateStairs?3000:6000
 const corridor=base.corridor,D=base.depthMm
 const corridors=base.corridors??[corridor]
 const passageWidth=Math.max(...corridors.map(r=>r.x1-r.x0)),lobbyWidth=Math.max(1800,passageWidth),hallWidth=2400+lobbyWidth
 const twin=base.layout==='ツイン'
 if(twin&&(corridors.length!==2||!base.voids?.length))throw new Error('ツインの廊下・吹抜け情報が不足しています')
 const endBridges:Rect[]=twin?[{id:'bridge-a',x0:corridor.x1,x1:corridors[1]!.x0,y0:0,y1:stairLength},{id:'bridge-b',x0:corridor.x1,x1:corridors[1]!.x0,y0:D-stairLength,y1:D}]:[]
 const originalVoids=twin?base.voids!.map(v=>({...v,y0:stairLength,y1:D-stairLength})):base.voids??[]
 if(D<18000)throw new Error('離れた2階段とEV乗り場を確保する奥行が不足しています')
 if(!outlines.length||outlines.some(o=>[...corridors,...endBridges,...originalVoids].some(r=>!inside(r,o))))throw new Error('全階を連続する廊下が外形に収まりません。ボリューム外形を調整してください。')
 const fits=(r:Rect)=>outlines.every(o=>inside(r,o))
 // 階段だけが収まる先着案ではなく、住戸・EV・動線まで成立した案を比較する。
 // ツインでは外周側の廊下へ接続し、反対の廊下からは端部の橋を使う。
 const sidePairs:readonly (readonly [-1|1,-1|1])[]=options.stairSides?[options.stairSides]:[[-1,-1],[1,1],[-1,1],[1,-1]]
 const candidates=sidePairs.map(sides=>({sides,stairs:sides.map((side,i)=>{
  const adjacent=twin&&side>0?corridors[1]!:corridor
  const x0=side<0?adjacent.x0-stairDepth:adjacent.x1,y0=i===0?0:D-stairLength
  return {id:i===0?'stairA':'stairB',x0,x1:x0+stairDepth,y0,y1:y0+stairLength} as AutoCore
 })})).filter(candidate=>candidate.stairs.every(fits))
 if(!candidates.length)throw new Error('全階の共通位置に2か所の階段を確保できません。外形を調整してください。')
 if(candidates.length>1){
  let best:{plans:Record<number,AutoPlan>}|undefined,score:LayoutPreference|undefined,lastError:unknown
  for(const {sides} of candidates){try{
   const result=arrangeCirculation(base,outlines,peoplePerUnit,totalResidents,{...options,stairSides:sides},unitFitCache)
   const candidateScore=layoutPreference(result.plans)
   if(!score||preferLayout(candidateScore,score)){best=result;score=candidateScore}
  }catch(error){lastError=error}}
  if(best)return best
  throw lastError??new Error('階段・EV・住戸を同時に配置できません')
 }
 const stairs=candidates[0]!.stairs
 const candidateResidents=base.cells.length*outlines.length*peoplePerUnit
 const upperFraction=(outlines.length-1)/outlines.length
 let count=estimateResidentialLifts((totalResidents??candidateResidents)*upperFraction,outlines.length,base.ev.storey_height).count
 let finalPlans:Record<number,AutoPlan>={}
 // 台数を減らした場合の住戸増加も確認。振動時は大きい台数を確保する。
 const seen=new Set<number>()
 for(let attempt=0;attempt<12;attempt++){
  seen.add(count)
  const length=Math.max(3000,count*2500)
  if(count&&length>D-12000)throw new Error('概算EV台数分の乗り場・昇降路が階段の間に収まりません')
  const hallCandidates=options.clusterElevator
   ? stairs.map((stair,i)=>({side:stair.x1===corridor.x0?-1:1,y0:i===0?stair.y1:stair.y0-length})).filter((_,i)=>options.elevatorEnd===undefined||i===options.elevatorEnd)
   : (twin?[-1]:[1,-1]).map(side=>({side,y0:Math.floor((D-length)/2)}))
  let hall=count?hallCandidates.map(({side,y0})=>({id:'evHall' as const,x0:side>0?corridor.x1:corridor.x0-hallWidth,x1:side>0?corridor.x1+hallWidth:corridor.x0,y0,y1:y0+length,evCount:count})).find(r=>fits(r)&&stairs.every(stair=>!intersects(r,stair))):undefined
  const right=hall?hall.x0===corridor.x1:true
  let lobby:Rect=hall?{...hall,id:'ev-lobby',x0:right?hall.x0:hall.x1-lobbyWidth,x1:right?hall.x0+lobbyWidth:hall.x1}:{id:'no-lobby',x0:0,x1:0,y0:0,y1:0}
  let liftShafts:Rect[]=hall?Array.from({length:count},(_,i)=>({id:`lift-${i+1}`,x0:right?lobby.x1:hall!.x0,x1:right?hall!.x1:lobby.x0,y0:hall!.y0+i*2500,y1:hall!.y0+(i+1)*2500})):[]
  const bridges=[...endBridges]
  let voids=[...originalVoids]
  if(twin&&count){
   const left=corridor.x1,rightX=corridors[1]!.x0,w=count*2500,center=(left+rightX)/2,top=options.clusterElevator?(options.elevatorEnd===1?D-stairLength-2400-lobbyWidth:stairLength):D/2-(2400+lobbyWidth)/2
   if(w>rightX-left)throw new Error('中央のEV昇降路と両廊下をつなぐ乗り場が収まりません')
   hall={id:'evHall',x0:center-w/2,x1:center+w/2,y0:top,y1:top+2400,evCount:count}
   lobby={id:'ev-lobby',x0:left,x1:rightX,y0:hall.y1,y1:hall.y1+lobbyWidth}
   if(!fits(hall)||!fits(lobby))throw new Error('中央のEV乗り場が全階の外形に収まりません')
   liftShafts=Array.from({length:count},(_,i)=>({id:`lift-${i+1}`,x0:hall!.x0+i*2500,x1:hall!.x0+(i+1)*2500,y0:top,y1:hall!.y1}))
   bridges.push(lobby)
   // EV・乗り場を床のない部分から除き、左右の余白も吹抜けとして保持する。
   voids=originalVoids.flatMap(v=>[
    {...v,id:v.id+'-north',y1:hall!.y0},
    {...v,id:v.id+'-south',y0:lobby.y1},
    {...v,id:v.id+'-west',y0:hall!.y0,y1:hall!.y1,x1:hall!.x0},
    {...v,id:v.id+'-east',y0:hall!.y0,y1:hall!.y1,x0:hall!.x1}
   ].filter(v=>v.x1>v.x0&&v.y1>v.y0))
  }
  if(count&&!hall)throw new Error('全階の共通位置にEV乗り場と昇降路を確保できません')
  const cores=hall?[...stairs,hall]:stairs
  const cells=options.recoverCoreSpace?base.cells.flatMap(c=>{const remaining=remainingCoreSpace(c,cores);return remaining?[remaining]:[]}):base.cells.filter(c=>cores.every(k=>!intersects(c,k))&&(c.y0+c.y1)/2>stairLength/2&&(c.y0+c.y1)/2<D-stairLength/2)
  // 終端の階段まで逆方向に進める住戸だけ残す。廊下への接続を持たない区画は除外。
  const connected=cells.filter(c=>corridors.some(r=>(Math.abs(c.x1-r.x0)<1||Math.abs(c.x0-r.x1)<1)&&c.y0>=r.y0&&c.y1<=r.y1))
  const shared=base.shaftRects.filter(s=>s.unitId&&connected.some(c=>c.id===s.unitId))
  shared.push({id:'EPS',kind:'EPS',x0:stairs[0]!.x0,y0:0,x1:stairs[0]!.x0+600,y1:600},{id:'DS',kind:'DS',x0:stairs[1]!.x0,y0:D-600,x1:stairs[1]!.x0+600,y1:D})
  const prepared:AutoPlan={...base,corridors,bridges,voids,cores,cells:connected,unitsPerFloor:connected.length,shaftRects:shared,ev:buildEvLevels({storeyCount:outlines.length,storeyHeightMm:base.ev.storey_height,evCount:count,evStops:count?outlines.map((_,i)=>i+1):[]})}

  finalPlans=Object.fromEntries(outlines.map((o,i)=>[i+1,fitFloorUnitsAutomatically(prepared,o,unitFitCache)]))
  finalPlans=alignUnitStacks(finalPlans)
  const units=Object.values(finalPlans).reduce((n,p)=>n+p.cells.length,0)
  if(!units)throw new Error('配置できる住戸がありません。住戸詳細・外形・共用部の条件を確認してください')
  const upperUnits=Object.entries(finalPlans).filter(([f])=>Number(f)>1).reduce((n,[,p])=>n+p.cells.length,0)
  const residents=totalResidents??Math.ceil(units*peoplePerUnit)
  const upperResidents=totalResidents===undefined?Math.ceil(upperUnits*peoplePerUnit):Math.ceil(totalResidents*(units?upperUnits/units:upperFraction))
  const estimate=estimateResidentialLifts(upperResidents,outlines.length,base.ev.storey_height)
  if(estimate.count!==count&&!(seen.has(estimate.count)&&count>estimate.count)){count=estimate.count;continue}
  for(const p of Object.values(finalPlans)){
   const entry=(c:Rect)=>{const e=placeUnitPlan(p.unitTypeIdsByCell?.[c.id]??'',p.unitPlanVariants?.[c.id]??'A',c,corridorForCell(p,c),p.unitPlanOverrides?.[c.id]).entrance;if(!e)throw new Error('玄関と共用廊下の接続がない住戸は動線を確定できません');return e}
   const routes=p.cells.flatMap(c=>{
    const r=corridorForCell(p,c),x=entry(c).x,y=entry(c).y,cx=(r.x0+r.x1)/2
    return stairs.map(stair=>{
     const sy=(stair.y0+stair.y1)/2
     const adjacent=corridors.find(path=>Math.abs(stair.x1-path.x0)<1||Math.abs(stair.x0-path.x1)<1)
     if(!adjacent)throw new Error('階段入口が共用廊下に接続していません')
     const targetX=(adjacent.x0+adjacent.x1)/2
     return [{x,y},{x:cx,y},{x:cx,y:sy},...(r.id!==adjacent.id?[{x:targetX,y:sy}]:[]),{x:stair.x1===adjacent.x0?stair.x1:stair.x0,y:sy}]
    })
   })
   const elevatorRoutes=count?p.cells.map(c=>{
    const r=corridorForCell(p,c),x=entry(c).x,y=entry(c).y,cx=(r.x0+r.x1)/2,ly=(lobby.y0+lobby.y1)/2
    return [{x,y},{x:cx,y},{x:cx,y:ly},{x:(lobby.x0+lobby.x1)/2,y:ly}]
   }):[]
   const walkingAreas=[...corridors,...bridges,...stairs,...(count?[lobby]:[])]
   if([...routes,...elevatorRoutes].some(route=>!routeCovered(route,walkingAreas,600)))throw new Error('共用動線に隙間または設計通行幅600 mm未満の区間があります')
   if([...routes,...elevatorRoutes].some(route=>!routeCovered(route.slice(1),walkingAreas,passageWidth)))throw new Error(`共用動線で指定廊下幅 ${passageWidth} mmを確保できません`)
   const routeMetrics=p.cells.map((c,i)=>({unitId:c.id,...routePairMetrics(routes[i*2]!,routes[i*2+1]!)}))
   if(routeMetrics.some(m=>!m.distinctDestinations))throw new Error('異なる階段入口への動線を確保できません')
   p.circulation={routeMetrics,elevatorRoutes,lobby,liftShafts,routes,residents,upperResidents,evCount:count,roundTripSeconds:estimate.roundTripSeconds,intervalSeconds:count?estimate.roundTripSeconds/count:0,capacityPerFiveMinutes:count?count*300*9*.8/estimate.roundTripSeconds:0,peoplePerUnit,populationOverride:totalResidents!==undefined}
  }
  const shaftIssues=shaftContinuityIssues(finalPlans)
  if(shaftIssues.length)throw new Error(shaftIssues.join('／'))
  const compositionIssues=options.validatePlans?.(finalPlans)??[]
  if(compositionIssues.length)throw new Error(compositionIssues.join('／'))
  return {plans:finalPlans}
 }
 throw new Error('居住人数とEV台数の計算が収束しませんでした')
}

