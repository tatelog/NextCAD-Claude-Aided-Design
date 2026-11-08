import {it,expect} from 'vitest'
import {prepareVolumePlan} from './volumePlan'
it('17.0×60mの両側バルコニーを住戸配置に先行して確保する',()=>{
 const v={footprint:[{x:0,y:0},{x:17000,y:0},{x:17000,y:60000},{x:0,y:60000}],storey_count:5,storey_height:3000}
 const result=prepareVolumePlan(v,[],{layout:'中廊下',span:3000,corridor:1600,unitDepth:6000,balconyDepth:1600})
 for(const p of Object.values(result.plans)){expect(p.cells.length).toBeGreaterThan(0);expect(p.balconies?.length).toBe(p.cells.length);expect(p.cells.every(c=>c.x0>=1600&&c.x1<=15400)).toBe(true)}
},30000)
