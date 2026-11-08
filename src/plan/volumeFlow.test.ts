import {it,expect} from 'vitest'
import {prepareVolumePlan} from './volumePlan'
import {validateUnitLayout} from './reshapeUnit'
it('実案件寸法の自動配置から有効な住戸詳細を引き継ぐ',()=>{
const r=prepareVolumePlan({footprint:[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500}],storey_count:5,storey_height:3000},[],{layout:'中廊下',span:3000,corridor:1600,unitDepth:6000});
for(const p of Object.values(r.plans)){expect(p.cells.length,JSON.stringify(p.automaticUnitRejections)).toBeGreaterThan(0);expect(p.rooms.length).toBeGreaterThan(0);for(const detail of Object.values(p.unitPlanOverrides??{}))expect(validateUnitLayout(detail)).toEqual([])}
},60000)
