import {expect,it} from 'vitest'
import {prepareVolumePlan} from './volumePlan'
import {validateUnitLayout} from './reshapeUnit'
import {entryChecks} from './entryChecks'
import {intersects} from './partitionConstraints'
import {writeFileSync} from 'node:fs'
it('住戸を割り付ける前に決めた共通通り芯を左右と全階で維持する',()=>{
 const {plans}=prepareVolumePlan({footprint:[{x:0,y:0},{x:17000,y:0},{x:17000,y:60000},{x:0,y:60000}],storey_count:2,storey_height:3000},[],{layout:'中廊下',span:4200,corridor:1600,unitDepth:6100,balconyDepth:1600,minimumFamilyRatio:1})
 writeFileSync('work/common-frame-layout.json',JSON.stringify(plans))
 const p=plans[1]!,columns=p.buildingColumns!
 const xs=[...new Set(columns.map(c=>c.x))].sort((a,b)=>a-b)
 const left=columns.filter(c=>c.x===xs[0]).map(c=>c.y)
 const right=columns.filter(c=>c.x===xs.at(-1)).map(c=>c.y)
 expect(left).toEqual(right)
 for(const x of xs)expect(columns.filter(c=>c.x===x).map(c=>c.y)).toEqual(left)
 for(let i=1;i<left.length;i++)expect(left[i]!-left[i-1]!).toBeLessThanOrEqual(6000)
 expect(plans[2]!.buildingColumns).toEqual(columns)
 expect(p.cells.length).toBeGreaterThan(0)
 for(const plan of Object.values(plans)){
  expect(entryChecks(plan).issues).toEqual([])
  for(const detail of Object.values(plan.unitPlanOverrides??{}))expect(validateUnitLayout(detail)).toEqual([])
  for(const column of plan.buildingColumns!){
   const box={x:column.x-300,y:column.y-300,w:600,h:600}
   for(const corridor of [...(plan.corridors??[plan.corridor]),...plan.cores,...(plan.bridges??[])])expect(intersects(box,{x:corridor.x0,y:corridor.y0,w:corridor.x1-corridor.x0,h:corridor.y1-corridor.y0})).toBe(false)
   for(const cell of plan.cells)if(intersects(box,{x:cell.x0,y:cell.y0,w:cell.x1-cell.x0,h:cell.y1-cell.y0}))expect(Math.min(Math.abs(column.x-cell.x0),Math.abs(column.x-cell.x1))).toBeLessThanOrEqual(300)
  }
 }
},120000)
