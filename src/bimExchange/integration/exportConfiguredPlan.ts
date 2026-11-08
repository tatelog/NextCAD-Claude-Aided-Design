import { SLAB_THICKNESS_MM } from '../../plan/buildingDimensions'
import {readUnitPlan,type UnitPlan39} from '../../plan/unitPlan39'
import {clearEntry} from '../../plan/entryClearance'
import {exportSavedPlan,type SavedPlanInput} from './exportSavedPlan'
import type {UnitSpecifications} from '../intermediate/unitGeometry'
import type {BimSettings} from '../../store/bimSettings'
export function exportConfiguredPlan(input:Omit<SavedPlanInput,'adapterOptions'>,settings:BimSettings){
 const {source,plans,storeyHeightMm:height,ifcSchema}=input;const {estimated,dimensions:dims}=settings
 const unitPlansByFloor:Record<number,Record<string,UnitPlan39>>={}
 const unitSpecificationsByFloor:Record<number,Record<string,UnitSpecifications>>={}
 for(const [floor,plan] of Object.entries(plans)){
 unitPlansByFloor[Number(floor)]={}
 unitSpecificationsByFloor[Number(floor)]={}
 for(const cell of plan.cells){const detail=plan.unitPlanOverrides?.[cell.id]??readUnitPlan(plan.unitTypeIdsByCell?.[cell.id]??'',plan.unitPlanVariants?.[cell.id]??'A');if(detail){const resolved=plan.unitPlanOverrides?.[cell.id]??clearEntry(detail);unitPlansByFloor[Number(floor)]![cell.id]=resolved
 if(estimated)unitSpecificationsByFloor[Number(floor)]![cell.id]={openings:Object.fromEntries(resolved.windows.flatMap(w=>{const r=resolved.rooms.find(r=>r.id===w.room_id);if(!r)return [];const horizontal=w.side==='N'||w.side==='S',length=horizontal?r.w:r.h,start=horizontal?r.x:r.y;return [[w.id,{widthMm:length*.5,startMm:start+length*.25,heightMm:dims.windowHeightMm,baseOffsetMm:SLAB_THICKNESS_MM+dims.windowSillMm,status:'estimated' as const}]]}))}
 }}
 }
 const options={slabThicknessMm:SLAB_THICKNESS_MM,unitPlansByFloor,...(estimated?{detailDimensions:dims,unitSpecificationsByFloor}:{})}
 return exportSavedPlan({source,plans,storeyHeightMm:height,adapterOptions:options,ifcSchema})

}
