import {unitMixIssues,validateUnitMix} from './unitMixConstraints'
import {familyShare,familyShareIssue} from './familyShare'
import {layoutPreference,preferLayout,type LayoutPreference} from './layoutPreference'
import {layoutMetrics} from './layoutQuality'
import {viableUnitType} from './automaticUnitFit'
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
export interface VolumePlanConfig {minimumFamilyRatio?:number;minimumUnitsPerFloor?:Readonly<Record<string,number>>;layout:CorridorLayout;span:number;corridor:number;unitDepth:number;people?:number;residents?:number;uniformDepth?:boolean;coreMode?:'従来'|'回転集約'}
export function prepareVolumePlan(volume:SiteVolume,boundaries:SlopeBoundary[],config:VolumePlanConfig):VolumePlan {
 validateUnitMix(config.minimumUnitsPerFloor??{})
 if(config.minimumFamilyRatio!==undefined)familyShareIssue({},[],config.minimumFamilyRatio)
 const inherited=inheritedFloors(volume,boundaries)
 if(!inherited||inherited.splitFloors.length)throw Error('分離した階の共用部配置は未対応です')
 const types=masterOf(candidates).filter(t=>(!config.uniformDepth||t.depth_mm===config.unitDepth)&&viableUnitType(t.id))
 if(!types.length)throw Error('使用条件を満たす住戸詳細がありません')
 validateUnitMix(config.minimumUnitsPerFloor??{},types.map(t=>t.id))
 const depths=config.layout==='ツイン'&&!config.uniformDepth
  ? [...new Set([config.unitDepth,...types.flatMap(t=>t.depth_mm?[t.depth_mm]:[])])].filter(d=>2*d+3*config.corridor<=inherited.widthMm)
  : [config.unitDepth]
 let best:Record<number,AutoPlan>|undefined,bestScore:LayoutPreference|undefined,lastError:unknown
 const family=types.filter(t=>t.ldk>0&&t.bedrooms>=2)
 const groups=family.length&&!config.uniformDepth?[types,family]:[types]
 const countPolicies=config.minimumFamilyRatio!==undefined||Object.values(config.minimumUnitsPerFloor??{}).some(n=>n>0)?[false,true]:[false]
 const seedPolicies=Object.values(config.minimumUnitsPerFloor??{}).some(n=>n>0)?[undefined,config.minimumUnitsPerFloor]:[undefined]
 for(const minimumUnitsPerFloor of seedPolicies)for(const preferMoreUnits of countPolicies)for(const depth of depths)for(const group of groups)for(const coreMode of (config.coreMode?[config.coreMode]:['従来','回転集約'])){try{
 const base=generateAutoPlan({targetPerFloor:1,storeyCount:volume.storey_count,storeyHeightMm:volume.storey_height,spanMm:config.span,unitDepthMm:depth,corridorMm:config.corridor,layout:config.layout,evCount:1,evStops:Array.from({length:volume.storey_count},(_,i)=>i+1),unitTypes:group,unitTypeIds:group.map(t=>t.id),optimizeTypes:true,preferMoreUnits,minimumUnitsPerFloor,outline:{widthMm:inherited.widthMm,depthMm:inherited.depthMm}})
 const result=arrangeCirculation(base,inherited.floors,config.people??3,config.residents,{rotateStairs:coreMode==='回転集約',clusterElevator:coreMode==='回転集約',validatePlans:plans=>{
  const issues=unitMixIssues(plans,config.minimumUnitsPerFloor??{})
  const familyIssue=config.minimumFamilyRatio===undefined?null:familyShareIssue(plans,types,config.minimumFamilyRatio)
  return familyIssue?[...issues,familyIssue]:issues
 }})
 const mixIssues=unitMixIssues(result.plans,config.minimumUnitsPerFloor??{})
 if(mixIssues.length)throw new Error(mixIssues.join('／'))
 const familyIssue=config.minimumFamilyRatio===undefined?null:familyShareIssue(result.plans,types,config.minimumFamilyRatio)
 if(familyIssue)throw new Error(familyIssue)
 const score=layoutPreference(result.plans)
 if(!bestScore||preferLayout(score,bestScore)){best=result.plans;bestScore=score}
 }catch(error){lastError=error}}
 if(!best)throw lastError??new Error('ツインの住戸・廊下・吹抜けが建物幅に収まりません')
 return {source:JSON.stringify([volume,boundaries,volume.storey_count,volume.storey_height]),span:config.span,plans:best}
}
export function inheritVolumePlan(snapshot:VolumePlan|null,source:string){return snapshot?.source===source?structuredClone(snapshot.plans):null}
export const useVolumePlan=create<{confirmed:VolumePlan|null;confirm:(plan:VolumePlan)=>void}>(set=>({confirmed:null,confirm:plan=>set({confirmed:structuredClone(plan)})}))

export function compareVolumePlans(volume:SiteVolume,boundaries:SlopeBoundary[],config:VolumePlanConfig){
 const options:Partial<Record<CorridorLayout,VolumePlan>>={},failures:Partial<Record<CorridorLayout,string>>={}
 let recommended:CorridorLayout|undefined,best:LayoutPreference|undefined
 let minimumFamilyRatio=config.minimumFamilyRatio
 for(const layout of [...new Set<CorridorLayout>([config.layout,'中廊下','片廊下','ツイン'])]){
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
