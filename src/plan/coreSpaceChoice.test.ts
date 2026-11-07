import {expect,it} from 'vitest'
import {arrangeCirculation} from './automaticCirculation'
import {prepareVolumePlan} from './volumePlan'
import {layoutMetrics} from './layoutQuality'
it('余白回収を試す際も、区画を除外した成立案より専有面積を減らさない',()=>{
 const outline=[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500}]
 const seed=prepareVolumePlan({footprint:outline,storey_count:2,storey_height:3000},[],{layout:'中廊下',span:3000,corridor:1600,unitDepth:7400}).plans[1]!
 const options={rotateStairs:true,clusterElevator:true} as const
 const old=arrangeCirculation(seed,[outline,outline],3,undefined,{...options,recoverCoreSpace:false})
 const next=arrangeCirculation(seed,[outline,outline],3,undefined,options)
 expect(layoutMetrics(next.plans).privateM2).toBeGreaterThanOrEqual(layoutMetrics(old.plans).privateM2)
 const variants=new Map<string,number>()
 const identity=(plans:typeof next.plans)=>JSON.stringify(Object.values(plans).map(p=>[p.cores,p.cells]))
 arrangeCirculation(seed,[outline,outline],3,undefined,{...options,validatePlans:plans=>{variants.set(identity(plans),layoutMetrics(plans).privateM2);return []}})
 expect(variants.size).toBeGreaterThan(1)
 const alternative=[...variants.keys()].find(key=>key!==identity(next.plans))!
 const constrained=arrangeCirculation(seed,[outline,outline],3,undefined,{...options,validatePlans:plans=>identity(plans)===alternative?[]:['住戸構成を満たさない候補']})
 expect(identity(constrained.plans)).toBe(alternative)
},120000)
