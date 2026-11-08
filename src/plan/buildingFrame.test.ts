import {it,expect} from 'vitest'
import {prepareVolumePlan} from './volumePlan'
import {frameOfPlan} from './planFrame'
import {entryChecks} from './entryChecks'
it('建物の柱芯を全階で共有し、重複・玄関と廊下の干渉を残さない',()=>{
 const v=prepareVolumePlan({footprint:[{x:0,y:0},{x:17000,y:0},{x:17000,y:60000},{x:0,y:60000}],storey_count:2,storey_height:3000},[],{layout:'中廊下',span:4200,corridor:1600,unitDepth:6100,balconyDepth:1600})
 const result=v.plans
 const a=frameOfPlan(result[1]!),b=frameOfPlan(result[2]!)
 expect(a.columns.length).toBeGreaterThan(0)
 expect(new Set(a.columns.map(p=>`${p.x},${p.y}`)).size).toBe(a.columns.length)
 expect(a.columns).toEqual(b.columns)
 for(const p of Object.values(result)){expect(frameOfPlan(p).issues).toEqual([]);expect(entryChecks(p).issues).toEqual([]);expect(p.cells.length).toBeGreaterThan(5)}
},60000)
