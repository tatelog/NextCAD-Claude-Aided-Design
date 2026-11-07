import {it,expect} from 'vitest'
import {prepareVolumePlan} from './volumePlan'
import {readUnitPlan,placeUnitPlan} from './unitPlan39'
import {validateUnitLayout} from './reshapeUnit'
import {corridorForCell} from './planCorridors'
import {cellInsideOutline} from './units'
const overlap=(a:{x0:number;x1:number;y0:number;y1:number},b:typeof a)=>Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0)>.1&&Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0)>.1
for(const layout of ['中廊下','片廊下','ツイン'] as const)it(`${layout}: 採用住戸の固定水回り・家具寸法・動線と配置包含を保証`,()=>{
 const footprint=[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500}]
 const result=prepareVolumePlan({footprint,storey_count:5,storey_height:3000},[],{layout,span:3000,corridor:1600,unitDepth:7400,coreMode:'回転集約'})
 const checked=new Set<string>()
 for(const floor of Object.values(result.plans)){
  expect(floor.cells.length).toBeGreaterThan(0)
  for(const cell of floor.cells){
   const p=floor.unitPlanOverrides?.[cell.id]
   expect(p).toBeDefined();if(!p)throw new Error('住戸詳細なし')
   expect(cellInsideOutline(cell,floor.buildingOutline??footprint)).toBe(true)
   expect([...floor.cores,...(floor.bridges??[]),...(floor.voids??[]),...floor.cells.filter(c=>c.id!==cell.id)].some(o=>overlap(cell,o))).toBe(false)
   const type=floor.unitTypeIdsByCell![cell.id]!
   expect(placeUnitPlan(type,'A',cell,corridorForCell(floor,cell),p).entrance).toBeDefined()
   const key=JSON.stringify(p);if(checked.has(key))continue;checked.add(key)
   expect(validateUnitLayout(p)).toEqual([])
   const source=['A','B','C'].map(v=>readUnitPlan(type,v)).find(s=>s?.id===p.id)
   expect(source).toBeTruthy();if(!source)throw new Error('元案なし')
   for(const r of source.rooms.filter(r=>r.kind==='水回り'||/浴室|WC|トイレ|洗面/.test(r.name))){const actual=p.rooms.find(n=>n.id===r.id)!;expect(Math.abs(actual.w-r.w)).toBeLessThan(.1);expect(Math.abs(actual.h-r.h)).toBeLessThan(.1)}
   for(const f of source.fixtures){const actual=p.fixtures.find(n=>n.id===f.id)!;expect(actual).toBeDefined();expect(Math.min(actual.w,actual.h)).toBeCloseTo(Math.min(f.w,f.h));expect(Math.max(actual.w,actual.h)).toBeCloseTo(Math.max(f.w,f.h))}
  }
 }
},60000)
