vi.mock('zustand',async()=>{const {createStore}=await import('zustand/vanilla');return {create:(init:any)=>{const api=createStore(init);return Object.assign((selector:any=(v:any)=>v)=>selector(api.getState()),api)}}})
import {it,expect,vi} from 'vitest'
import type {ReactElement,ReactNode} from 'react'
vi.mock('react',async importOriginal=>({...await importOriginal<typeof import('react')>(),useCallback:(fn:unknown)=>fn,useDebugValue:()=>{},useEffect:()=>{},useRef:(v:unknown)=>({current:v}),useState:(v:unknown)=>[typeof v==='function'?v():v,()=>{}],useSyncExternalStore:(_s:unknown,get:()=>unknown)=>get()}))
import {VolumePlanPanel} from './VolumePlanPanel'
import {useSite} from '../store/site'
import {useVolumeDraft} from '../store/volumeDraft'
import {useVolumePlan} from '../plan/volumePlan'
import {generateAutoPlan} from '../plan/autoPlan'
function buttons(node:ReactNode):ReactElement<{children?:ReactNode;onClick?:()=>void}>[]{if(Array.isArray(node))return node.flatMap(buttons);if(!node||typeof node!=='object'||!('props'in node))return [];const e=node as ReactElement<{children?:ReactNode;onClick?:()=>void}>;return [...(['button','input'].includes(String(e.type))?[e]:[]),...buttons(e.props.children)]}
it('比較欄で選んだ案を平面と積算が参照する採用案にする',()=>{
 const volume={footprint:[{x:0,y:0},{x:26000,y:0},{x:26000,y:66000},{x:0,y:66000}],storey_count:5,storey_height:3000}
 useSite.setState({volume,slopeBoundaries:[]})
 const source=JSON.stringify([volume,[],5,3000])
 const base={targetPerFloor:4,storeyCount:5,storeyHeightMm:3000,spanMm:6000,unitDepthMm:6000,corridorMm:1600,evCount:1,evStops:[1,2,3,4,5]}
 const middle={source,span:6000,plans:{1:generateAutoPlan({...base,layout:'中廊下'})}}
 const twin={source,span:6000,plans:{1:generateAutoPlan({...base,layout:'ツイン'})}}
 useVolumePlan.setState({confirmed:middle})
 useVolumeDraft.getState().save(source,{draft:middle,comparison:{options:{'中廊下':middle,'ツイン':twin},failures:{},recommended:'ツイン'},minimumTexts:{},people:'3',residents:'',familyBaseline:0})
 const tree=VolumePlanPanel({})
 const choice=buttons(tree).find(b=>(b.props as any)['aria-label']==='自動構成・ツインを選択')!
 expect(choice).toBeDefined();(choice.props as any).onChange()
 expect(useVolumePlan.getState().confirmed?.plans[1]?.layout).toBe('中廊下')
 buttons(tree).find(b=>b.props.children==='選んだパターンで更新')!.props.onClick!()
 expect(useVolumePlan.getState().confirmed?.plans[1]?.layout).toBe('ツイン')
})


