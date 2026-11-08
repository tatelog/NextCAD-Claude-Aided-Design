import {create} from 'zustand'
import type {compareVolumePlans,VolumePlan} from '../plan/volumePlan'
export interface PatternComparison {
 label:string
 result:ReturnType<typeof compareVolumePlans>
}
export interface VolumeDraft {
 selectedCandidate?:{label:string;layout:string}|null
 patternComparisons?:PatternComparison[]
 draft:VolumePlan|null
 comparison:ReturnType<typeof compareVolumePlans>|null
 minimumTexts:Record<string,string>
 people:string
 residents:string
 familyBaseline:number|null
}
/** 画面遷移で未引継ぎ案を捨てない。入力条件が違う案は再利用しない。 */
export const useVolumeDraft=create<{
 key:string;value:VolumeDraft|null
 save:(key:string,value:VolumeDraft)=>void
 read:(key:string)=>VolumeDraft|null
}>((set,get)=>({key:'',value:null,save:(key,value)=>set({key,value}),read:key=>get().key===key?get().value:null}))
