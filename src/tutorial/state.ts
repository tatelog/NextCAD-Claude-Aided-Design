import {create} from 'zustand'
import {tutorialSteps} from './steps'
/** 再開する手順と、その手順の画面 */
export type ResumeTarget={index:number;screen:string}
type TutorialState={
 active:boolean;index:number
 /** 途中で止めた手順（同じ画面を開いている間だけ覚える。代表 2026-11-08 の案 A）。無ければ null */
 pausedIndex:number|null
 setActive:(active:boolean)=>void;setIndex:(index:number)=>void
 /** 指定の手順から始める（再開を含む） */
 start:(index:number)=>void
 /** 途中で止める。止めた手順を覚える */
 pause:()=>void
 /** 最後まで終えた。止めた手順を消す */
 finish:()=>void
 /** 次に始める手順。止めた手順があればそこから、無ければ 1 手目（P1） */
 resumeTarget:()=>ResumeTarget
}
export const useTutorial=create<TutorialState>((set,get)=>({
 active:false,index:0,pausedIndex:null,
 setActive:active=>set(active?{active}:{active,pausedIndex:get().index}),
 setIndex:index=>set({index}),
 start:index=>set({active:true,index,pausedIndex:null}),
 pause:()=>set({active:false,pausedIndex:get().index}),
 finish:()=>set({active:false,pausedIndex:null}),
 resumeTarget:()=>{const i=get().pausedIndex;const step=i===null?undefined:tutorialSteps[i];return step?{index:i!,screen:step.screen}:{index:0,screen:tutorialSteps[0].screen}},
}))
/** チュートリアル中のモード。チュートリアル中は System だけ使える（代表 2026-11-08）。終われば元のモード */
export function tutorialModeOf(active:boolean,mode:string){return active?'system':mode}
export function tutorialDone(target:string){window.dispatchEvent(new CustomEvent('tutorial-action',{detail:target}))}
