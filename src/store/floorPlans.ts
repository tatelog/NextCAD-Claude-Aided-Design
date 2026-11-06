import { create } from 'zustand'
import type { AutoPlan } from '../plan/autoPlan'
/** 配置はボリュームの版と階に紐づける。別の階を暗黙に複製しない。 */
export const useFloorPlans = create<{
 rectangle: {source:string;widthMm:number;depthMm:number} | null;
 applyRectangle:(source:string,plan:AutoPlan,count:number)=>void;
 source: string; plans: Record<number, AutoPlan>; selected: number;
 select: (floor: number) => void;
 put: (source: string, floor: number, plan: AutoPlan | null) => void;
}>((set) => ({rectangle:null,
 applyRectangle:(source,plan,count)=>set({source,selected:1,rectangle:{source,widthMm:plan.widthMm,depthMm:plan.depthMm},plans:Object.fromEntries(Array.from({length:count},(_,i)=>[i+1,structuredClone(plan)]))}),
 source:'', plans:{}, selected:1,
 select:(selected)=>set({selected}),
 put:(source,floor,plan)=>set(s=>{const plans=source===s.source?{...s.plans}:{}; if(plan) plans[floor]=plan;else delete plans[floor];return {source,plans}})
}))
