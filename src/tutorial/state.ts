import {create} from 'zustand'
export const useTutorial=create<{active:boolean;index:number;setActive:(active:boolean)=>void;setIndex:(index:number)=>void}>(set=>({active:false,index:0,setActive:active=>set({active}),setIndex:index=>set({index})}))
export function tutorialDone(target:string){window.dispatchEvent(new CustomEvent('tutorial-action',{detail:target}))}
