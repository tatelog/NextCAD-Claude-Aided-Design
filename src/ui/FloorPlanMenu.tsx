import {useEffect,useState,useRef} from 'react'
import {startVolumeCalculation,type VolumeCalculationInput} from '../plan/volumeCalculation'
import {useVolumePlan} from '../plan/volumePlan'
import {patternConfiguration} from '../plan/patternConfiguration'
import {tutorialDone} from '../tutorial/state'
import {VolumePlanPanel} from './VolumePlanPanel'
import type { Point } from '../geom/viewport'
import type { AutoPlan } from '../plan/autoPlan'
import type { UnitType } from '../plan/unitTypeMaster'
const PATTERNS = [
 ['均一', ['2LDK','2LDK','2LDK']],
 ['1LDK・2LDK混合', ['1LDK','2LDK','1LDK','2LDK']],
 ['ファミリー混合', ['3LDK','2LDK','2LDK','3LDK']],
 ['大小混合', ['1K','1LDK','2LDK','3LDK']],
] as const
export function FloorPlanMenu({floors,plans,widthMm,depthMm,selected,onSelect,types,pattern,onPattern}: {
 floors: Point[][]; plans: Record<number,AutoPlan>; widthMm:number; depthMm:number; selected:number; onSelect:(floor:number)=>void;
 types:readonly UnitType[]; pattern:string[]; onPattern:(ids:string[])=>void
}) {
 const [input,setInput]=useState<VolumeCalculationInput|null>(null)
 const key=JSON.stringify(input)
 const latest=useRef(key);latest.current=key
 const [statuses,setStatuses]=useState<Record<string,{key:string;ok:boolean|null;reason:string;counts?:string}>>({})
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const applyJob=useRef<ReturnType<typeof startVolumeCalculation>|null>(null)
 useEffect(()=>()=>applyJob.current?.cancel(),[])
 const idsOf=(names:readonly string[])=>names.map(name=>types.find(t=>t.name===name)?.id).filter((id):id is string=>!!id)
 useEffect(()=>{
  let stopped=false;let job:ReturnType<typeof startVolumeCalculation>|null=null
  setError('')
  const timer=setTimeout(async()=>{
   if(!input)return
   for(const [label,names] of PATTERNS){
    if(stopped)return
    try{
     const ids=idsOf(names)
     if(ids.length!==names.length)throw new Error('住戸タイプが未登録です')
     job=startVolumeCalculation([input[0],input[1],{...input[2],...patternConfiguration(ids)}])
     const result=await job.result
     if(stopped)return
     const option=result.options[input[2].layout]
     const ok=!!option
     const counts=option?Object.entries(option.plans).map(([floor,p])=>`${floor}階：${p.cells.length}戸`).join('／'):undefined
     setStatuses(old=>({...old,[label]:{key,ok,counts,reason:ok?'':result.failures[input[2].layout]??'指定構成が収まりません'}}))
    }catch(e){if(!stopped)setStatuses(old=>({...old,[label]:{key,ok:null,reason:String(e)}}))}
   }
  },400)
  return ()=>{stopped=true;clearTimeout(timer);job?.cancel()}
 },[key,types])
 const apply=async()=>{
  if(!input||busy)return
  setBusy(true);setError('')
  try{
   const job=startVolumeCalculation([input[0],input[1],{...input[2],...patternConfiguration(pattern)}]);applyJob.current=job
   const result=await job.result
   if(latest.current!==key)throw new Error('条件が変更されました。再計算してください')
   const selected=result.options[input[2].layout]
   if(!selected)throw new Error(result.failures[input[2].layout]??'指定構成が収まりません')
   useVolumePlan.getState().confirm(selected)
   tutorialDone('tutorial-plan')
  }catch(e){setError(`更新できません（前の配置を保持）：${e instanceof Error?e.message:String(e)}`)}
  finally{setBusy(false);applyJob.current=null}
 }
 return <div style={{padding:10}}>
  <details open>
  <summary style={{fontSize:14,fontWeight:700,cursor:"pointer",padding:"8px 0"}}>各階レイアウト</summary>
  <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:6}}>
   {floors.map((outline,index)=>{const floor=index+1,plan=plans[floor];return <button key={floor} type="button" aria-label={`${floor}階のレイアウト`} aria-pressed={selected===floor} onClick={()=>onSelect(floor)} style={{padding:5,border:selected===floor?'2px solid #243953':'1px solid #d7dbe1',borderRadius:5,background:selected===floor?'#edf2f7':'white',color:'#243953'}}>
    <svg viewBox={`-500 -500 ${widthMm+1000} ${depthMm+1000}`} style={{width:'100%',height:90}} aria-hidden="true">
     <polygon points={outline.map(p=>`${p.x},${p.y}`).join(' ')} fill="#f1f3f5" stroke="#788697" strokeWidth={1} vectorEffect="non-scaling-stroke"/>
     {plan?.cells.map(c=><rect key={c.id} x={c.x0} y={c.y0} width={c.x1-c.x0} height={c.y1-c.y0} fill="#b9cbdc" stroke="#fff" strokeWidth={0.5} vectorEffect="non-scaling-stroke"/>)}
    </svg>
    <div>{floor}階</div><small>{outline.length<3?'床なし':plan?`${plan.cells.length}戸・配置案`:'未配置'}</small>
   </button>})}
  </div>
  </details>
  <VolumePlanPanel onPatternInput={setInput} />
  <details open style={{marginTop:18}}><summary style={{fontSize:14,fontWeight:700,cursor:"pointer",padding:"8px 0"}}>住戸構成パターン</summary>
  <p style={{fontSize:11}}>使用する住戸タイプを選び、現在の外形に配置できる戸数を計算します。最低戸数は指定しません。</p>
  {PATTERNS.map(([label,names])=>{const ids=idsOf(names),status=statuses[label],fresh=status?.key===key;return <label key={label} style={{display:'block',width:'100%',marginBottom:6,textAlign:'left',padding:6,boxSizing:'border-box',border:'1px solid #ccd4dc',borderRadius:4}}><strong><input type="checkbox" checked={ids.join()===pattern.join()} disabled={busy||(fresh&&!status.ok)} onChange={e=>onPattern(e.target.checked?ids:[])} />{label}</strong><div role="status">{fresh?(status.ok===null?'判定失敗':status.ok?'配置案あり':'条件を満たす配置案なし'):(input?'判定中…':'未判定')}</div>{fresh&&status.ok&&<small>{status.counts}</small>}{fresh&&!status.ok&&<details><summary>配置できなかった理由</summary><ul style={{paddingLeft:'1.5em'}}>{[...new Set(status.reason.split('／'))].map(reason=><li key={reason}>{reason}</li>)}</ul></details>}<svg viewBox="0 0 180 76" style={{display:'block',width:'100%',height:76}} aria-hidden="true">{[0,1,2].map(row=>names.map((name,k)=><g key={`${row}-${k}`}><rect x={k*180/names.length+2} y={row*24+2} width={180/names.length-4} height={20} rx={2} fill={name==='1K'?'#d9e8df':name==='1LDK'?'#d9e6f2':name==='2LDK'?'#b6cce0':'#c6bddc'}/>{row===1&&<text x={(k+.5)*180/names.length} y={row*24+16} textAnchor="middle" fontSize="9" fill="#243953">{name}</text>}</g>))}</svg><small>{[...new Set(names)].map(name=>name).join('／')}</small></label>})}
  <button type="button" onClick={apply} disabled={!floors.length||!input||!pattern.length||busy} style={{width:'100%',marginTop:8}}>{busy?'再計算中…':'この構成条件で各階を再計算'}</button>
  {error&&<p role="alert">{error}</p>}
  </details>
 </div>
}
