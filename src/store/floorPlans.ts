import { create } from 'zustand'
import type { AutoPlan } from '../plan/autoPlan'
/** 配置はボリュームの版と階に紐づける。別の階を暗黙に複製しない。 */
export const useFloorPlans = create<{
 source: string; plans: Record<number, AutoPlan>; selected: number;
 select: (floor: number) => void;
 put: (source: string, floor: number, plan: AutoPlan | null) => void;
}>((set) => ({source:'', plans:{}, selected:1,
 select:(selected)=>set({selected}),
 put:(source,floor,plan)=>set(s=>{const plans=source===s.source?{...s.plans}:{}; if(plan) plans[floor]=plan;else delete plans[floor];return {source,plans}})
}))
