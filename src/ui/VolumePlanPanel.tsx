import {CalculationOverlay} from './CalculationOverlay'
import {unitThumbnailColor} from '../plan/unitThumbnailColor'
import {validateUnitLayout} from '../plan/reshapeUnit'
import {createPortal} from 'react-dom'
import {useVolumeDraft,type PatternComparison,type VolumeDraft} from '../store/volumeDraft'
import {parseMinimumUnits} from '../plan/minimumUnitsInput'
import {familyShare,currentFamilyShare} from '../plan/familyShare'
import {useFloorPlans} from '../store/floorPlans'
import {masterOf} from '../plan/unitTypeMaster'
import unitCandidates from '../plan/unitTypeCandidates.json'
import {layoutMetrics} from '../plan/layoutQuality'
import {layoutPreference} from '../plan/layoutPreference'
import {CirculationComparison} from './CirculationComparison'
import type {CorridorLayout} from '../plan/candidateCells'
import {useTutorial,tutorialDone} from '../tutorial/state'
import {useState,useEffect,useRef} from 'react'
import {startVolumeCalculation} from '../plan/volumeCalculation'
import {useSite} from '../store/site'
import {useP3Input} from '../store/p3Input'
import {compareVolumePlans,useVolumePlan,type VolumePlan} from '../plan/volumePlan'
const PATTERNS = [
 ['均一', ['2LDK']],
 ['1LDK・2LDK混合', ['1LDK','2LDK']],
 ['ファミリー混合', ['3LDK','2LDK']],
 ['大小混合', ['1K','1LDK','2LDK','3LDK']],
] as const
export function VolumePlanPanel({onNext}:{onNext?:()=>void}){
 const tutorialActive=useTutorial(s=>s.active)
 const [controlsTarget,setControlsTarget]=useState<HTMLElement|null>(null)
 useEffect(()=>{setControlsTarget(document.getElementById('plan-layout-controls'))},[])
 const volume=useSite(s=>s.volume),boundaries=useSite(s=>s.slopeBoundaries)
 const {values:v,setValue}=useP3Input(s=>s)
 const {confirmed,confirm}=useVolumePlan()
 const signature=JSON.stringify([volume,boundaries,volume?.storey_count,volume?.storey_height])
 const saved=useVolumeDraft.getState().read(signature)
 const [patternComparisons,setPatternComparisons]=useState<PatternComparison[]>(saved?.patternComparisons??[])
 const [selectedCandidate,setSelectedCandidate]=useState<VolumeDraft['selectedCandidate']>(saved?.selectedCandidate??null)
 const [pendingCandidate,setPendingCandidate]=useState<{label:string;layout:string}|null>(null)
 const pendingSelection=useRef<{label:string;layout:string}|null>(null)
 const [progress,setProgress]=useState('')
 const comparisonSource=useRef(signature)
 useEffect(()=>{if(comparisonSource.current!==signature){comparisonSource.current=signature;setComparison(null);setPatternComparisons([]);setDraft(null)}},[signature])
 const [comparison,setComparison]=useState<ReturnType<typeof compareVolumePlans>|null>(saved?.comparison??null)
 const [draft,setDraft]=useState<VolumePlan|null>(saved?.draft??null),[error,setError]=useState('')
 useEffect(()=>{if(confirmed?.source===signature)setDraft(confirmed)},[confirmed,signature])
 const [minimumTexts,setMinimumTexts]=useState<Record<string,string>>(saved?.minimumTexts??{})
 const [people,setPeople]=useState(saved?.people??'3'),[residents,setResidents]=useState(saved?.residents??'')

 const [familyBaseline,setFamilyBaseline]=useState<number|null>(()=>currentFamilyShare(useFloorPlans.getState(),confirmed,signature,masterOf(unitCandidates)))
 const [busy,setBusy]=useState(false)
 const job=useRef<ReturnType<typeof startVolumeCalculation>|null>(null)
 const revision=useRef(0)
 const calculationKey=JSON.stringify([signature,v.layoutText,v.spanText,v.corridorText,v.unitDepthText,v.balconyDepthText,people,residents,tutorialActive,minimumTexts])
 useEffect(()=>{revision.current++;job.current?.cancel();job.current=null;if(busy)setBusy(false);return ()=>{revision.current++;job.current?.cancel()}},[calculationKey])
 const objectWidth=volume?Math.max(...volume.footprint.map(p=>p.x))-Math.min(...volume.footprint.map(p=>p.x)):0
 const objectDepth=volume?Math.max(...volume.footprint.map(p=>p.y))-Math.min(...volume.footprint.map(p=>p.y)):0
 const frontageCandidates=masterOf(unitCandidates).flatMap(t=>t.frontage_mm&&t.frontage_mm>0?[t.frontage_mm]:[])
 const derivedSpan=Math.min(objectDepth,...frontageCandidates)
 const balconyDepth=Number(v.balconyDepthText??'1600')
 const indoorWidth=objectWidth-balconyDepth*(v.layoutText==='片廊下'?1:2)
 const derivedDepth=v.layoutText==='片廊下'?indoorWidth-Number(v.corridorText):(indoorWidth-Number(v.corridorText)*(v.layoutText==='ツイン'?3:1))/2
 useEffect(()=>{if(objectWidth>0&&objectDepth>0){setValue('spanText',String(derivedSpan));setValue('unitDepthText',String(derivedDepth))}},[objectWidth,objectDepth,derivedSpan,derivedDepth,setValue])
 const calculate=async()=>{
  pendingSelection.current=null;setPendingCandidate(null);job.current?.cancel();const id=++revision.current;setComparison(null);setPatternComparisons([]);setError('');setProgress('自動構成')
  if(!volume){setError('ボリューム外形がありません');return}
  setBusy(true)
  try{
   const pending=startVolumeCalculation([volume,boundaries??[],{selectedLayoutOnly:!!onNext,layout:v.layoutText,span:derivedSpan,corridor:Number(v.corridorText),unitDepth:derivedDepth,balconyDepth,people:Number(people),residents:residents.trim()?Number(residents):undefined,uniformDepth:false,minimumUnitsPerFloor:parseMinimumUnits(minimumTexts),minimumFamilyRatio:familyBaseline??undefined}]);job.current=pending
   const compared=await pending.result;if(id!==revision.current)return
   setComparison(compared);if(onNext)setDraft(compared.options[v.layoutText]??null)
   const selected=compared.options[v.layoutText]
   if(familyBaseline===null&&selected)setFamilyBaseline(familyShare(selected.plans,masterOf(unitCandidates)))
   if(selected&&onNext){useVolumeDraft.getState().save(signature,{draft:selected,comparison:compared,minimumTexts,people,residents,familyBaseline:familyBaseline??familyShare(selected.plans,masterOf(unitCandidates))});confirm(selected);onNext?.()}
   if(onNext&&!selected)setError(compared.failures[v.layoutText]??'配置できません')
   if(!onNext){
    const results:PatternComparison[]=[]
    for(const [label,names] of PATTERNS){
     if(id!==revision.current)return
     setProgress(label)
     const types=masterOf(unitCandidates)
     const allowedTypeIds=names.map(name=>types.find(t=>t.name===name)?.id).filter((id):id is string=>!!id)
     if(allowedTypeIds.length!==names.length)throw new Error(`${label}の住戸タイプが未登録です`)
     const pending=startVolumeCalculation([volume,boundaries??[],{layout:v.layoutText,span:derivedSpan,corridor:Number(v.corridorText),unitDepth:derivedDepth,balconyDepth,people:Number(people),residents:residents.trim()?Number(residents):undefined,uniformDepth:false,minimumUnitsPerFloor:parseMinimumUnits(minimumTexts),minimumFamilyRatio:familyBaseline??(selected?familyShare(selected.plans,types):undefined),allowedTypeIds}])
     job.current=pending
     const result=await pending.result
     if(id!==revision.current)return
     results.push({label,result});setPatternComparisons([...results])
    }
    useVolumeDraft.getState().save(signature,{draft:current,comparison:compared,patternComparisons:results,selectedCandidate,minimumTexts,people,residents,familyBaseline:familyBaseline??(selected?familyShare(selected.plans,masterOf(unitCandidates)):null)})
   }
  }catch(e){if(id===revision.current)setError(e instanceof Error?e.message:String(e))}
  finally{if(id===revision.current){setBusy(false);job.current=null}}
 }
 useEffect(()=>{
  if(onNext||!volume||saved?.comparison||saved?.patternComparisons?.length)return
  const timer=setTimeout(()=>{void calculate()},400)
  return ()=>clearTimeout(timer)
 },[signature,onNext])
 if(onNext)return <section data-tutorial="tutorial-p2-next"><button type="button" disabled={busy} onClick={calculate}>{busy?'配置を計算中…':'次へ（平面）'}</button>{busy&&<CalculationOverlay/>}{error&&<p role="alert">{error}</p>}</section>
 const current=draft?.source===signature?draft:null
 const plan=current?.plans[1]
 const invalidate=(patch:Partial<VolumeDraft>={})=>{
  pendingSelection.current=null;setPendingCandidate(null);setComparison(null);setPatternComparisons([]);setSelectedCandidate(null)
  useVolumeDraft.getState().save(signature,{draft:null,comparison:null,patternComparisons:[],selectedCandidate:null,minimumTexts,people,residents,familyBaseline,...patch})
 }
 const updateSelected=()=>{
  const selected=pendingSelection.current
  if(!selected||busy)return
  const result=selected.label==='自動構成'?comparison:patternComparisons.find(p=>p.label===selected.label)?.result
  const option=result?.options[selected.layout as CorridorLayout]
  if(!option||option.source!==signature)return
  setSelectedCandidate(selected);setDraft(option);setValue('layoutText',selected.layout as CorridorLayout);confirm(option)
  useVolumeDraft.getState().save(signature,{draft:option,comparison,patternComparisons,selectedCandidate:selected,minimumTexts,people,residents,familyBaseline})
  pendingSelection.current=null;setPendingCandidate(null)
  if(tutorialActive)tutorialDone('tutorial-plan')
 }
 const change=(key:'balconyDepthText'|'spanText'|'corridorText'|'unitDepthText'|'layoutText',value:string)=>{useVolumePlan.setState({confirmed:null});setDraft(null);invalidate();setValue(key,value as typeof v[typeof key])}
 return <section data-tutorial="tutorial-plan" aria-label="住戸構成・廊下パターンの比較" style={{margin:'12px 0'}}>
 <h3>住戸構成パターン</h3><p style={{fontSize:12}}>サムネイルから候補を選び、「更新」で各階の平面に反映します。</p>
 {controlsTarget&&createPortal(<>
 <div role="group" aria-label="廊下タイプ" data-tutorial="tutorial-fit" style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>{(['中廊下','片廊下','階段室','ツイン'] as CorridorLayout[]).map(layout=><button type="button" key={layout} disabled={layout==='階段室'} aria-pressed={v.layoutText===layout} title={layout==='階段室'?'自動配置未対応':undefined} className={v.layoutText===layout?'is-active':undefined} onClick={()=>{change('layoutText',layout);tutorialDone('tutorial-fit')}}>{layout==='階段室'?'階段室型':layout}</button>)}</div>
 <label style={{display:'block'}}>廊下の幅 (mm)<input value={v.corridorText} onChange={e=>change('corridorText',e.target.value)} style={{width:'100%'}}/></label>
 <label style={{display:'block'}}>バルコニー奥行（mm）<input type="number" min={1} value={v.balconyDepthText??'1600'} onChange={e=>change('balconyDepthText',e.target.value)} style={{width:'100%'}}/></label>
 <label style={{display:'block'}}>1戸あたり人数<input type="number" min={1} value={people} onChange={e=>{useVolumePlan.setState({confirmed:null});setPeople(e.target.value);setDraft(null);invalidate({people:e.target.value})}} style={{width:'100%'}}/></label>
 <label style={{display:'block'}}>全階の想定人数（空欄で自動）<input type="number" min={1} value={residents} onChange={e=>{useVolumePlan.setState({confirmed:null});setResidents(e.target.value);setDraft(null);invalidate({residents:e.target.value})}} style={{width:'100%'}}/></label>
 </>,controlsTarget)}
 <div style={{background:'white',padding:'8px 0',borderBottom:'1px solid #d7dbe1'}}>
 {pendingCandidate&&<small style={{display:'block',marginBottom:4}}>{pendingCandidate.label}・{pendingCandidate.layout}を選択中</small>}
 <button type="button" disabled={busy||!pendingCandidate} onClick={updateSelected} style={{width:'100%'}}>選んだパターンで更新</button>
 </div>
 {busy&&<><p role="status">{progress}を計算しています。</p><button onClick={()=>{revision.current++;job.current?.cancel();job.current=null;setBusy(false)}}>計算を取消</button></>}
 {(comparison||patternComparisons.length>0)&&<section aria-label="配置案の比較">
 {[...(comparison?[{label:'自動構成',result:comparison}]:[]),...patternComparisons].map(({label,result},index)=><details key={label} open style={{marginTop:8}}><summary style={{fontWeight:700,padding:'5px 0',cursor:'pointer'}}><span style={{display:'inline-block',minWidth:22,marginRight:6,padding:'1px 4px',borderRadius:3,background:'#e8eef5',color:'#315a83',textAlign:'center',fontSize:11,fontVariantNumeric:'tabular-nums'}}>{String(index+1).padStart(2,'0')}</span>{label}</summary>
 <div aria-label={`${label}の戸数・面積・構成比較`} style={{display:'grid',gap:6}}>{Object.entries(result.options).map(([layout,option])=>{const m=layoutMetrics(option!.plans);const picked=pendingCandidate?.label===label&&pendingCandidate.layout===layout;const adopted=JSON.stringify(confirmed)===JSON.stringify(option)&&(selectedCandidate?selectedCandidate.label===label&&selectedCandidate.layout===layout:label==='自動構成');const counts=Object.values(option!.plans).reduce<Record<string,number>>((counts,p)=>{for(const c of p.cells){const id=p.unitTypeIdsByCell?.[c.id]??'';const name=masterOf(unitCandidates).find(t=>t.id===id)?.name??'未分類';counts[name]=(counts[name]??0)+1}return counts},{});return <div key={layout} style={{border:picked?'2px solid #315a83':'1px solid #ccd4dc',outline:adopted?'1px solid #8da4bc':undefined,padding:6,borderRadius:4,fontSize:12,background:picked?'#edf4fb':'white'}}>
 <label style={{display:'block',cursor:busy?'default':'pointer'}}>
 <span style={{display:'flex',alignItems:'center',gap:4}}><input type="radio" name="plan-pattern" aria-label={`${label}・${layout}を選択`} disabled={busy} checked={!!picked} onChange={()=>{pendingSelection.current={label,layout};setPendingCandidate({label,layout})}}/><strong>{layout}</strong>{adopted&&<small style={{marginLeft:'auto'}}>反映中</small>}</span>
 <svg viewBox="0 0 180 76" role="img" aria-label={`${label}・${layout}のサムネイル`} style={{display:'block',width:'100%',height:76}}>
 <rect x="2" y={layout==='片廊下'?2:34} width="176" height="8" rx="2" fill="#edf0f3"/>
 {layout==='ツイン'&&<rect x="2" y="38" width="176" height="4" fill="#fff"/>}
 {Object.values(option!.plans)[0]?.cells.slice(0,8).map((c,i)=>{const first=Object.values(option!.plans)[0]!;const typeId=first.unitTypeIdsByCell?.[c.id]??'';const name=masterOf(unitCandidates).find(t=>t.id===typeId)?.name??'住戸';const planId=first.unitPlanOverrides?.[c.id]?.id??'';const variant=/-([ABC])$/.exec(planId)?.[1];const displayName=variant?`${name}-${variant}`:name;const cols=4;const x=(i%cols)*45+2;const y=layout==='片廊下'?14+Math.floor(i/cols)*28:Math.floor(i/cols)*43+3;return <g key={c.id}><title>{`${displayName}（${typeId}）`}</title><rect x={x} y={y} width="41" height="25" rx="2" fill={unitThumbnailColor(typeId,planId)}/><text x={x+20.5} y={y+16} textAnchor="middle" fontSize="8" fill="#243953">{displayName}</text></g>})}
 </svg>
 </label>
 <div>全階 {m.units.toLocaleString()}戸</div>
 <details><summary>戸数・面積・動線の詳細</summary>
 <div>専有 {m.privateM2.toFixed(1)} m²</div>
 <div>{Object.entries(counts).map(([name,count])=>`${name} ${count}戸`).join('／')}</div>
 <div>{Object.entries(option!.plans).map(([floor,p])=>`${floor}階 ${p.cells.length}戸`).join('／')}</div>
 <div>ファミリー {(familyShare(option!.plans,masterOf(unitCandidates))*100).toFixed(1)}%</div><div>専有率※ {(m.rentableRatio*100).toFixed(1)}%</div><div>外形利用率 {(m.envelopeRatio*100).toFixed(1)}%</div><div>最小LDK/DK {m.minLivingM2?.toFixed(1)??'未確認'} m²</div>
 <CirculationComparison options={[{name:layout,metrics:layoutPreference(option!.plans)}]}/>
 </details></div>})}</div>
 {Object.entries(result.failures).map(([name,reason])=><details key={name}><summary>{name}：配置案なし</summary><p style={{fontSize:11,overflowWrap:'anywhere'}}>{reason}</p></details>)}
 </details>)}
 </section>}

 <hr style={{border:0,borderTop:'1px solid #b9c4d0',margin:'18px 0 12px'}}/>
 {current&&<details><summary>採用案の配置・自動調整</summary>
 {(()=>{const m=layoutMetrics(current.plans);const floors=Object.values(current.plans);const checked=floors.filter(p=>p.automaticUnitRejections!==undefined);const details=floors.flatMap(p=>Object.values(p.unitPlanOverrides??{}));const passed=details.filter(p=>validateUnitLayout(p).length===0).length;return <ul style={{paddingLeft:18,marginLeft:"1.5em"}}>
 <li>配置住戸：全階 {m.units}戸</li>
 <li>自動調整済み住戸：{floors.reduce((n,p)=>n+Object.keys(p.unitPlanOverrides??{}).length,0)}戸</li>
 <li>住戸詳細の条件検査
 <ul style={{listStyle:"none",paddingLeft:"1em",margin:0}}>
 <li>適合：{passed}戸</li>
 <li>要確認：{details.length-passed}戸</li>
 <li>詳細未登録：{Math.max(0,m.units-details.length)}戸</li>
 </ul>
 </li>
 <li>自動調整の判定記録：{checked.length}階／{floors.length}階</li>
 <li>配置除外：{checked.reduce((n,p)=>n+Object.keys(p.automaticUnitRejections??{}).length,0)}候補（判定記録のある階）</li>
 {plan&&<><li>階段：{plan.cores.filter(c=>c.id!=='evHall').length}か所／1階</li><li>EV：{plan.circulation?.evCount??'未確定'}台</li></>}
 <li>専有面積（全階）：{m.privateM2.toFixed(1)} m²</li>
 <li>共用面積（全階）：{m.commonM2.toFixed(1)} m²</li>
 <li>バルコニー面積（全階）：{m.balconyM2.toFixed(1)} m²</li>
 <li>未割付面積（全階）：{m.unassignedM2.toFixed(1)} m²</li>
 <li title="住戸区画面積÷（室内外形面積−吹抜け）">専有率（区画面積による概算）：{(m.rentableRatio*100).toFixed(1)}%</li>
 <li title="バルコニーを含む配置範囲に対する住戸区画面積">外形利用率：{(m.envelopeRatio*100).toFixed(1)}%</li>
 <li>LDK/DK最小面積：{m.minLivingM2===null?'未確認':`${m.minLivingM2.toFixed(1)} m²`}</li>
 <li>LDK/DK最小短辺：{m.minLivingShortMm===null?'未確認':`${m.minLivingShortMm.toLocaleString()} mm`}</li>
 </ul>})()}
 {Object.entries(current.plans).map(([floor,p])=>Object.keys(p.automaticUnitRejections??{}).length>0&&<details key={floor}><summary>{floor}階：配置できない候補があります</summary>{Object.entries(p.automaticUnitRejections??{}).map(([id,reasons])=><details key={id}><summary>{id}：{reasons[0]}</summary><ul>{reasons.map((r,i)=><li key={i}>{r}</li>)}</ul></details>)}</details>)}</details>}
 {plan&&plan.shafts.ps<plan.cells.length&&<p style={{color:"#a64b00"}}>PS未配置の住戸があります。水回りと縦シャフトの接続は要確認です。</p>}
 <small>計画配置の確認です。法規・構造・設備の適合確定ではありません。</small>{error&&<p role="alert">{error}</p>}
 <section aria-label="パターンの条件" style={{marginTop:16}}>
<details><summary>比較の条件</summary><p style={{fontSize:12}}>自動構成・均一・1LDK／2LDK混合・ファミリー混合・大小混合を、中廊下・片廊下・ツインで計算します。混合は使用可能なタイプの指定です。割合は固定せず、実際の内訳を各候補に表示します。階段室型は自動配置未対応です。サムネイルは住戸構成の模式図です。色は住戸タイプと原案（A・B・C）に対応し、同じ案は同じ色です。</p>
 <p>ファミリー住戸（2LDK以上）の割合：{familyBaseline===null?'現在案がないため、最初の計算案を基準にします':`${(familyBaseline*100).toFixed(1)}%以上を維持します`}。建物全体の戸数で比較します。</p>
 {v.layoutText==='ツイン'&&<p>左右の住戸列と廊下を吹抜けで分け、両端で接続します。住戸データの奥行も比較して自動調整します。</p>}
 </details>
 <details><summary>住戸構成の条件</summary><p>各階で確保する最低戸数です。空欄・0は指定なし。外形や共用部との調整後も満たす候補を比較します。</p>
 {masterOf(unitCandidates).filter(t=>t.frontage_mm!==null&&t.depth_mm!==null).map(t=><label key={t.id} style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>{t.name}（各階の最低戸数）<input aria-label={`${t.name}の各階最低戸数`} type="number" min={0} step={1} value={minimumTexts[t.id]??''} placeholder="指定なし" style={{width:90}} onChange={e=>{useVolumePlan.setState({confirmed:null});setMinimumTexts(v=>({...v,[t.id]:e.target.value}));setDraft(null);invalidate({minimumTexts:{...minimumTexts,[t.id]:e.target.value}});setError('')}}/></label>)}
 </details>
 <button disabled={busy} onClick={calculate}>{busy?'候補を計算中…':'条件から候補を再計算'}</button>
 </section>
 </section>
}
