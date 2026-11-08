// 仕様: 廊下と住戸構成を一つの比較欄にまとめ、サムネイルを選んだだけでは採用せず、更新で反映する。
vi.mock('zustand',async()=>{const {createStore}=await import('zustand/vanilla');return {create:(init:any)=>{const api=createStore(init);return Object.assign((selector:any=(v:any)=>v)=>selector(api.getState()),api)}}})
import {it,expect,vi} from 'vitest'
import type {ReactElement,ReactNode} from 'react'
vi.mock('react',async importOriginal=>({...await importOriginal<typeof import('react')>(),useEffect:()=>{},useRef:(v:unknown)=>({current:v}),useState:(v:unknown)=>[typeof v==='function'?v():v,()=>{}]}))
import {VolumePlanPanel} from './VolumePlanPanel'
import {useSite} from '../store/site'
import {useVolumeDraft} from '../store/volumeDraft'
import {useVolumePlan} from '../plan/volumePlan'
import {generateAutoPlan} from '../plan/autoPlan'
function nodes(node:ReactNode):ReactElement<any>[]{if(Array.isArray(node))return node.flatMap(nodes);if(!node||typeof node!=='object'||!('props'in node))return [];const e=node as ReactElement<any>;return [e,...nodes(e.props.children)]}
it('住戸構成と廊下形式の候補を同じ比較欄から採用できる',()=>{
 const volume={footprint:[{x:0,y:0},{x:26000,y:0},{x:26000,y:66000},{x:0,y:66000}],storey_count:5,storey_height:3000}
 useSite.setState({volume,slopeBoundaries:[]})
 const source=JSON.stringify([volume,[],5,3000])
 const plan={source,span:6000,plans:{1:generateAutoPlan({targetPerFloor:4,storeyCount:5,storeyHeightMm:3000,spanMm:6000,unitDepthMm:6000,corridorMm:1600,evCount:1,evStops:[1,2,3,4,5],layout:'片廊下'})}}
 useVolumeDraft.getState().save(source,{draft:null,comparison:null,minimumTexts:{},people:'3',residents:'',familyBaseline:0,patternComparisons:[{label:'均一',result:{options:{'片廊下':plan},failures:{},recommended:'片廊下'}}]} as any)
 const tree=nodes(VolumePlanPanel({}))
 expect(tree.filter(n=>n.props['aria-label']==='住戸構成・廊下パターンの比較')).toHaveLength(1)
 const choice=tree.find(n=>n.type==='input'&&n.props['aria-label']==='均一・片廊下を選択')
 expect(choice).toBeDefined()
 const before=useVolumePlan.getState().confirmed
 choice!.props.onChange()
 expect(useVolumePlan.getState().confirmed).toBe(before)
 expect(tree.some(n=>n.type==='svg'&&n.props['aria-label']==='均一・片廊下のサムネイル')).toBe(true)
 tree.find(n=>n.type==='button'&&n.props.children==='選んだパターンで更新')!.props.onClick()
 expect(useVolumePlan.getState().confirmed).toEqual(plan)
})
