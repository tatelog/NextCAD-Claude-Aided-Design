import {coordinateBuildingFrame} from './buildingFrame'
import {balconyReservation,indoorOutlines,attachBalconies,DEFAULT_BALCONY_DEPTH} from './balconyPlan'
import {unitMixIssues,validateUnitMix} from './unitMixConstraints'
import {familyShare,familyShareIssue} from './familyShare'
import {layoutPreference,preferLayout,type LayoutPreference} from './layoutPreference'
import {layoutMetrics} from './layoutQuality'
import {fitUnitAutomatically} from './automaticUnitFit'
import {readUnitPlan} from './unitPlan39'
import {create} from 'zustand'
import type {SiteVolume} from '../store/site'
import type {SlopeBoundary} from '../volume/slope'
import {inheritedFloors} from './inheritedFloors'
import {generateAutoPlan, type AutoPlan} from './autoPlan'
import {arrangeCirculation} from './automaticCirculation'
import type {CorridorLayout} from './candidateCells'
import {masterOf} from './unitTypeMaster'
import candidates from './unitTypeCandidates.json'
export interface VolumePlan {source:string; span:number; plans:Record<number,AutoPlan>}
export interface VolumePlanConfig {selectedLayoutOnly?:boolean;balconyDepth?:number;allowedTypeIds?:readonly string[];minimumFamilyRatio?:number;minimumUnitsPerFloor?:Readonly<Record<string,number>>;layout:CorridorLayout;span:number;corridor:number;unitDepth:number;people?:number;residents?:number;uniformDepth?:boolean;coreMode?:'従来'|'回転集約'}
/** unitFitCache: 住戸の当てはめの結果の控え。鍵は計算の入力をすべて含むので、寸法の候補を続けて調べるとき（compactPlan）に渡して使い回せる */
export function prepareVolumePlan(volume:SiteVolume,boundaries:SlopeBoundary[],config:VolumePlanConfig,unitFitCache=new Map<string,ReturnType<typeof fitUnitAutomatically>>()):VolumePlan {
 validateUnitMix(config.minimumUnitsPerFloor??{})
 if(config.minimumFamilyRatio!==undefined)familyShareIssue({},[],config.minimumFamilyRatio)
 const inherited=inheritedFloors(volume,boundaries)
 if(!inherited||inherited.splitFloors.length)throw Error('分離した階の共用部配置は未対応です')
 const balconyDepth=config.balconyDepth??DEFAULT_BALCONY_DEPTH
 const reservation=balconyReservation(inherited.widthMm,config.corridor,config.layout,balconyDepth)
 const insideFloors=indoorOutlines(inherited.floors,inherited.widthMm,balconyDepth,config.layout)
 const types=masterOf(candidates).filter(t=>(!config.uniformDepth||t.depth_mm===config.unitDepth)&&['A','B','C'].some(v=>!!readUnitPlan(t.id,v))&&(!config.allowedTypeIds||config.allowedTypeIds.includes(t.id)))
 if(!types.length)throw Error('使用条件を満たす住戸詳細がありません')
 validateUnitMix(config.minimumUnitsPerFloor??{},types.map(t=>t.id))
 const depths=config.layout==='ツイン'&&!config.uniformDepth
  ? [...new Set([config.unitDepth,...types.flatMap(t=>t.depth_mm?[t.depth_mm]:[])])].filter(d=>2*d+3*config.corridor<=reservation.innerWidth)
  : [Math.min(config.unitDepth,reservation.unitDepth)]
 let best:Record<number,AutoPlan>|undefined,bestScore:LayoutPreference|undefined
 const failures=new Set<string>()
 const family=types.filter(t=>t.ldk>0&&t.bedrooms>=2)
 const groups=config.minimumFamilyRatio===1?[family]:family.length&&!config.uniformDepth?[types,family]:[types]
 const countPolicies=!!config.allowedTypeIds||config.minimumFamilyRatio!==undefined||Object.values(config.minimumUnitsPerFloor??{}).some(n=>n>0)?[false,true]:[false]
 const seedPolicies=Object.values(config.minimumUnitsPerFloor??{}).some(n=>n>0)?[undefined,config.minimumUnitsPerFloor]:[undefined]
 for(const minimumUnitsPerFloor of seedPolicies)for(const preferMoreUnits of countPolicies)for(const depth of depths)for(const group of groups)for(const coreMode of (config.coreMode?[config.coreMode]:['従来','回転集約'])){try{
 // バルコニー確保後の住戸帯に合わせ、タイプ別面積レンジと室内条件を満たす間口を種として探索する。
 const seedFailures:string[]=[]
 const seedTypes=group.flatMap(t=>{
  const sources=['A','B','C'].flatMap(v=>{const p=readUnitPlan(t.id,v);return p?[p]:[]})
  const seedKey=`seed:${t.id}:${depth}:${inherited.depthMm}`
  let fitted=unitFitCache.get(seedKey)
  if(!fitted){fitted=fitUnitAutomatically(sources,{maxDepth:depth,maxFrontage:inherited.depthMm});unitFitCache.set(seedKey,fitted)}
  if(!fitted.plan)seedFailures.push(...fitted.reasons.map(reason=>`${t.name}：${reason}`))
  const candidates=fitted.candidates??(fitted.plan?[fitted.plan]:[])
  const fit=[...candidates].sort((a,b)=>a.envelope.W-b.envelope.W)[0]
  return fit?[{...t,depth_mm:depth,frontage_mm:Math.ceil(fit.envelope.W/100)*100}]:[]
 })
 if(!seedTypes.length)throw new Error(`可変配置の候補が条件を満たしません（住戸帯奥行 ${depth.toLocaleString()} mm）：${[...new Set(seedFailures)].join('／')}`)
 const base=generateAutoPlan({targetPerFloor:1,storeyCount:volume.storey_count,storeyHeightMm:volume.storey_height,spanMm:config.span,unitDepthMm:depth,corridorMm:config.corridor,layout:config.layout,evCount:1,evStops:Array.from({length:volume.storey_count},(_,i)=>i+1),unitTypes:seedTypes,unitTypeIds:seedTypes.map(t=>t.id),optimizeTypes:true,preferMoreUnits,minimumUnitsPerFloor,outline:{widthMm:reservation.innerWidth,depthMm:inherited.depthMm}})
 base.frameUnitTypeIds=seedTypes.map(t=>t.id)
 // 長辺6mの階段を明示選択した場合は柱面間6mを先に予約する。
 // 通り芯を決めた後で柱を抜いたり、住戸単位で移動したりしない。
 const frameSpan=config.coreMode==='従来'?7200:6000
 base.frameGridY=Array.from({length:Math.ceil(inherited.depthMm/frameSpan)+1},(_,i)=>Math.round(i*inherited.depthMm/Math.ceil(inherited.depthMm/frameSpan)))
 const result=arrangeCirculation(base,insideFloors,config.people??3,config.residents,{rotateStairs:coreMode==='回転集約',clusterElevator:coreMode==='回転集約',validatePlans:plans=>{
  const issues=unitMixIssues(plans,config.minimumUnitsPerFloor??{})
  const familyIssue=config.minimumFamilyRatio===undefined?null:familyShareIssue(plans,types,config.minimumFamilyRatio)
  return familyIssue?[...issues,familyIssue]:issues
 }},unitFitCache)
 result.plans=Object.fromEntries(Object.entries(result.plans).map(([floor,p])=>[floor,attachBalconies(p,inherited.floors[Number(floor)-1]!,inherited.widthMm,balconyDepth)]))
 result.plans=coordinateBuildingFrame(result.plans)
 const mixIssues=unitMixIssues(result.plans,config.minimumUnitsPerFloor??{})
 if(mixIssues.length)throw new Error(mixIssues.join('／'))
 const familyIssue=config.minimumFamilyRatio===undefined?null:familyShareIssue(result.plans,types,config.minimumFamilyRatio)
 if(familyIssue)throw new Error(familyIssue)
 const score=layoutPreference(result.plans)
 if(!bestScore||preferLayout(score,bestScore)){best=result.plans;bestScore=score}
 }catch(error){failures.add(error instanceof Error?error.message:String(error))}}
 if(!best)throw new Error([...failures].join('／')||'バルコニー・住戸・廊下・共用部が建物外形に収まりません')
 return {source:JSON.stringify([volume,boundaries,volume.storey_count,volume.storey_height]),span:config.span,plans:best}
}
export function inheritVolumePlan(snapshot:VolumePlan|null,source:string){return snapshot?.source===source?structuredClone(snapshot.plans):null}
export const useVolumePlan=create<{confirmed:VolumePlan|null;confirm:(plan:VolumePlan)=>void}>(set=>({confirmed:null,confirm:plan=>set({confirmed:structuredClone(plan)})}))

export function compareVolumePlans(volume:SiteVolume,boundaries:SlopeBoundary[],config:VolumePlanConfig){
 const options:Partial<Record<CorridorLayout,VolumePlan>>={},failures:Partial<Record<CorridorLayout,string>>={}
 let recommended:CorridorLayout|undefined,best:LayoutPreference|undefined
 let minimumFamilyRatio=config.minimumFamilyRatio
 for(const layout of (config.selectedLayoutOnly?[config.layout]:[...new Set<CorridorLayout>([config.layout,'中廊下','片廊下','ツイン'])])){
  try{const option=prepareVolumePlan(volume,boundaries,{...config,layout,minimumFamilyRatio});const m=layoutMetrics(option.plans)
   if(!m.units)throw new Error('住戸の品質条件を満たす配置がありません')
   if(minimumFamilyRatio===undefined&&layout===config.layout)minimumFamilyRatio=familyShare(option.plans,masterOf(candidates))
   options[layout]=option
   const score=layoutPreference(option.plans)
   if(!best||preferLayout(score,best)){recommended=layout;best=score}
  }catch(e){failures[layout]=e instanceof Error?e.message:String(e)}
 }
 return {options,failures,recommended}
}

