import {corridorForCell} from '../plan/planCorridors'
import type {AutoPlan} from '../plan/autoPlan'
import type {Fixture,FixtureItem} from '../plan/fixtures'
import {placeUnitPlan} from '../plan/unitPlan39'
export function fixturesFromPlans(plans:Record<number,AutoPlan>):Fixture[]{
 const rows:Fixture[]=[]
 for(const [floor,p] of Object.entries(plans))for(const cell of p.cells){
  const unit=placeUnitPlan(p.unitTypeIdsByCell?.[cell.id]??'',p.unitPlanVariants?.[cell.id]??'A',cell,corridorForCell(p,cell),p.unitPlanOverrides?.[cell.id])
  if(unit.status!=='ok'||!unit.plan)continue
  for(const f of unit.plan.fixtures){
   const item:FixtureItem|null=f.kind.includes('キッチン')?'kitchen':f.kind==='浴槽'?'unit_bath':f.kind.includes('洗面')?'washbasin':f.kind==='便器'||f.kind==='WC'?'toilet':/クローゼット|収納|シューズ/.test(f.kind)?'storage':null
   if(item)rows.push({id:`auto-${floor}-${cell.id}-${f.id}`,unitId:`${floor}F-${cell.id}`,item})
  }
 }
 return rows
}
