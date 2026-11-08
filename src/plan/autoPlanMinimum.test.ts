import {expect,it} from 'vitest'
import {generateAutoPlan} from './autoPlan'
import {masterOf} from './unitTypeMaster'
import candidates from './unitTypeCandidates.json'
const types=masterOf(candidates).filter(t=>t.frontage_mm!==null)
it.each(['片廊下','中廊下'] as const)('%sの初期割付に最低戸数を反映する',layout=>{
 const family=types.find(t=>t.name==='2LDK')!
 const plan=generateAutoPlan({targetPerFloor:1,storeyCount:2,storeyHeightMm:3000,spanMm:3000,unitDepthMm:7400,corridorMm:1600,layout,evCount:1,evStops:[1,2],unitTypes:types,unitTypeIds:types.map(t=>t.id),optimizeTypes:true,minimumUnitsPerFloor:{[family.id]:3},outline:{widthMm:26000,depthMm:66500}})
 expect(plan.cells.filter(c=>plan.unitTypeIdsByCell?.[c.id]===family.id).length).toBeGreaterThanOrEqual(3)
})
