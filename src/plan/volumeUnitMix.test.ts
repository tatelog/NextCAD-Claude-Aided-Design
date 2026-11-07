import {it,expect} from 'vitest'
import {prepareVolumePlan} from './volumePlan'
import {validateUnitLayout} from './reshapeUnit'
import {placeUnitPlan} from './unitPlan39'
import {corridorForCell} from './planCorridors'
import {shaftContinuityIssues} from './shaftContinuity'
import {familyShare} from './familyShare'
import {masterOf} from './unitTypeMaster'
import candidates from './unitTypeCandidates.json'
const volume={footprint:[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500}],storey_count:2,storey_height:3000}
it('構成指定時は最終的に残る住戸で各階の最低戸数を満たす候補を返す',()=>{
 const result=prepareVolumePlan(volume,[],{layout:'中廊下',span:3000,corridor:1600,unitDepth:7400,coreMode:'回転集約',minimumUnitsPerFloor:{'T-08-2LDK':1},minimumFamilyRatio:.5})
 expect(familyShare(result.plans,masterOf(candidates))).toBeGreaterThanOrEqual(.5)
 for(const p of Object.values(result.plans)){
  expect(p.cells.filter(c=>p.unitTypeIdsByCell?.[c.id]==='T-08-2LDK').length).toBeGreaterThanOrEqual(1)
  for(const [i,c] of p.cells.entries()){
   const placed=placeUnitPlan(p.unitTypeIdsByCell?.[c.id]??'',p.unitPlanVariants?.[c.id]??'A',c,corridorForCell(p,c),p.unitPlanOverrides?.[c.id])
   expect(placed.status,c.id).toBe('ok')
   expect(placed.entrance,c.id).toBeDefined()
   expect(validateUnitLayout(placed.plan!),c.id).toEqual([])
   expect(p.circulation?.routes[i*2]?.[0],c.id).toEqual(placed.entrance)
   expect(p.circulation?.routes[i*2+1]?.[0],c.id).toEqual(placed.entrance)
   expect(p.circulation?.routeMetrics?.find(m=>m.unitId===c.id)?.distinctDestinations,c.id).toBe(true)
  }
 }
 expect(shaftContinuityIssues(result.plans)).toEqual([])
},120000)
