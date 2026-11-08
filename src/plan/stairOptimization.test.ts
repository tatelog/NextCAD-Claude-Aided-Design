// 代表の最適配置要件: 両端の階段を左右別々に比較し、収まるだけの先着案で決めない。
// 各候補は同じ外形・住戸・EV条件。専有面積を減らさず、同面積なら階段・EVへの距離を短くする。
import {it,expect} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs' // work/ は git の対象外なので、無ければ作ってから書く（統括 2026-11-08）
import {generateAutoPlan} from './autoPlan'
import {arrangeCirculation} from './automaticCirculation'
import {layoutPreference,preferLayout} from './layoutPreference'
import {masterOf} from './unitTypeMaster'
import candidates from './unitTypeCandidates.json'
import {viableUnitType} from './automaticUnitFit'
import {shaftContinuityIssues} from './shaftContinuity'
const types=masterOf(candidates).filter(t=>viableUnitType(t.id))
const base=()=>generateAutoPlan({unitTypes:types,unitTypeIds:types.map(t=>t.id),optimizeTypes:true,targetPerFloor:1,storeyCount:2,storeyHeightMm:3000,spanMm:3000,unitDepthMm:7400,corridorMm:1600,layout:'中廊下',evCount:1,evStops:[1,2],outline:{widthMm:26000,depthMm:66500}})
const outline=[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500}]
const pairs=[[-1,-1],[1,1],[-1,1],[1,-1]] as const
it('階段は両端それぞれで指定した廊下側に置き、全階で同位置を保つ',()=>{
 const result=arrangeCirculation(base(),[outline,outline],3,undefined,{rotateStairs:true,clusterElevator:true,elevatorEnd:0,stairSides:[1,-1]})
 for(const p of Object.values(result.plans)){
  expect(p.cores.find(c=>c.id==='stairA')!.x0).toBe(p.corridor.x1)
  expect(p.cores.find(c=>c.id==='stairB')!.x1).toBe(p.corridor.x0)
  expect(p.circulation!.routeMetrics!.every(r=>r.distinctDestinations)).toBe(true)
 }
 expect(shaftContinuityIssues(result.plans)).toEqual([])
},60000)
it('左右の階段候補を住戸割付後に比較し、より良い成立候補を取りこぼさない',()=>{
 const b=base(),options={rotateStairs:true,clusterElevator:true,elevatorEnd:0 as const}
 const choices=pairs.map(stairSides=>{
  const result=arrangeCirculation(b,[outline,outline],3,undefined,{...options,stairSides})
  return {stairSides,score:layoutPreference(result.plans)}
 })
 const auto=arrangeCirculation(b,[outline,outline],3,undefined,options),score=layoutPreference(auto.plans)
 expect(choices.every(c=>!preferLayout(c.score,score))).toBe(true)
 mkdirSync('work',{recursive:true});writeFileSync('work/stair-side-comparison.json',JSON.stringify({choices,selected:score},null,2))
},120000)
