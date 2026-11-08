import {validateUnitLayout} from '../plan/reshapeUnit'
import {createPortal} from 'react-dom'
import {useVolumeDraft} from '../store/volumeDraft'
import {EntryCheckPanel} from './EntryCheckPanel'
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
import {type VolumeCalculationInput,startVolumeCalculation} from '../plan/volumeCalculation'
import {useSite} from '../store/site'
import {useP3Input} from '../store/p3Input'
import {compareVolumePlans,useVolumePlan,type VolumePlan} from '../plan/volumePlan'
export function VolumePlanPanel({onNext,onPatternInput}:{onNext?:()=>void;onPatternInput?:(input:VolumeCalculationInput|null)=>void}){
 const tutorialActive=useTutorial(s=>s.active)
 const [controlsTarget,setControlsTarget]=useState<HTMLElement|null>(null)
 useEffect(()=>{setControlsTarget(document.getElementById('plan-layout-controls'))},[])
 const volume=useSite(s=>s.volume),boundaries=useSite(s=>s.slopeBoundaries)
 const {values:v,setValue}=useP3Input(s=>s)
 const {confirmed,confirm}=useVolumePlan()
 const signature=JSON.stringify([volume,boundaries,volume?.storey_count,volume?.storey_height])
 const saved=useVolumeDraft.getState().read(signature)
 const [comparison,setComparison]=useState<ReturnType<typeof compareVolumePlans>|null>(saved?.comparison??null)
 const [draft,setDraft]=useState<VolumePlan|null>(saved?.draft??null),[error,setError]=useState('')
 useEffect(()=>{if(confirmed?.source===signature)setDraft(confirmed)},[confirmed,signature])
 const [minimumTexts,setMinimumTexts]=useState<Record<string,string>>({})
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
 useEffect(()=>{
  onPatternInput?.(volume?[volume,boundaries??[],{layout:v.layoutText,span:derivedSpan,corridor:Number(v.corridorText),unitDepth:derivedDepth,balconyDepth,people:Number(people),residents:residents.trim()?Number(residents):undefined,uniformDepth:false,minimumFamilyRatio:familyBaseline??undefined}]:null)
 },[calculationKey,familyBaseline,derivedSpan,derivedDepth,onPatternInput])
 const calculate=async()=>{
  useVolumePlan.setState({confirmed:null})
  job.current?.cancel();const id=++revision.current;setDraft(null);setComparison(null);setError('')
  if(!volume){setError('ボリューム外形がありません');return}
  setBusy(true)
  try{
   const pending=startVolumeCalculation([volume,boundaries??[],{selectedLayoutOnly:!!onNext,layout:v.layoutText,span:derivedSpan,corridor:Number(v.corridorText),unitDepth:derivedDepth,balconyDepth,people:Number(people),residents:residents.trim()?Number(residents):undefined,uniformDepth:false,minimumUnitsPerFloor:parseMinimumUnits(minimumTexts),minimumFamilyRatio:familyBaseline??undefined}]);job.current=pending
   const compared=await pending.result;if(id!==revision.current)return
   setComparison(compared);setDraft(compared.options[v.layoutText]??null)
   const selected=compared.options[v.layoutText]
   if(familyBaseline===null&&selected)setFamilyBaseline(familyShare(selected.plans,masterOf(unitCandidates)))
   if(selected){useVolumeDraft.getState().save(signature,{draft:selected,comparison:compared,minimumTexts,people,residents,familyBaseline:familyBaseline??familyShare(selected.plans,masterOf(unitCandidates))});confirm(selected);onNext?.()}
   if(!compared.options[v.layoutText])setError(compared.failures[v.layoutText]??'配置できません')
  }catch(e){if(id===revision.current)setError(e instanceof Error?e.message:String(e))}
  finally{if(id===revision.current){setBusy(false);job.current=null}}
 }
 if(onNext)return <section data-tutorial="tutorial-p2-next"><button type="button" disabled={busy} onClick={calculate}>{busy?'配置を計算中…':'次へ（平面）'}</button>{busy&&<p role="status">柱位置・住戸・共用部の配置を計算して平面へ引き継ぎます。</p>}{error&&<p role="alert">{error}</p>}</section>
 const current=draft?.source===signature?draft:null
 const plan=current?.plans[1]
 const change=(key:'balconyDepthText'|'spanText'|'corridorText'|'unitDepthText'|'layoutText',value:string)=>{useVolumePlan.setState({confirmed:null});setDraft(null);setComparison(null);setValue(key,value as typeof v[typeof key])}
 return <section data-tutorial="tutorial-plan" aria-label="廊下・住戸構成の比較" style={{border:'1px solid #ccc',padding:8,margin:'12px 0'}}>
 <h3>廊下・住戸構成の比較</h3><p>柱割り・廊下・階段・EV・縦シャフトをここで確認します。住戸タイプは利用可能な範囲へ自動割付します。</p>
 <p>ファミリー住戸（2LDK以上）の割合：{familyBaseline===null?'現在案がないため、最初の計算案を基準にします':`${(familyBaseline*100).toFixed(1)}%以上を維持します`}。建物全体の戸数で比較します。</p>
 {v.layoutText==='ツイン'&&<p>左右の住戸列と廊下を吹抜けで分け、両端で接続します。住戸データの奥行も比較して自動調整します。</p>}
 {controlsTarget&&createPortal(<>
 <div role="group" aria-label="廊下タイプ" data-tutorial="tutorial-fit" style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>{(['中廊下','片廊下','階段室','ツイン'] as CorridorLayout[]).map(layout=><button type="button" key={layout} disabled={layout==='階段室'} aria-pressed={v.layoutText===layout} title={layout==='階段室'?'自動配置未対応':undefined} className={v.layoutText===layout?'is-active':undefined} onClick={()=>{change('layoutText',layout);tutorialDone('tutorial-fit')}}>{layout==='階段室'?'階段室型':layout}</button>)}</div>
 <label style={{display:'block'}}>廊下の幅 (mm)<input value={v.corridorText} onChange={e=>change('corridorText',e.target.value)} style={{width:'100%'}}/></label>
 <label style={{display:'block'}}>バルコニー奥行（mm）<input type="number" min={1} value={v.balconyDepthText??'1600'} onChange={e=>change('balconyDepthText',e.target.value)} style={{width:'100%'}}/></label>
 <label style={{display:'block'}}>1戸あたり人数<input type="number" min={1} value={people} onChange={e=>{useVolumePlan.setState({confirmed:null});setPeople(e.target.value);setDraft(null);setComparison(null)}} style={{width:'100%'}}/></label>
 <label style={{display:'block'}}>全階の想定人数（空欄で自動）<input type="number" min={1} value={residents} onChange={e=>{useVolumePlan.setState({confirmed:null});setResidents(e.target.value);setDraft(null);setComparison(null)}} style={{width:'100%'}}/></label>
 </>,controlsTarget)}
 <details><summary>住戸構成の条件</summary><p>各階で確保する最低戸数です。空欄・0は指定なし。外形や共用部との調整後も満たす候補を比較します。</p>
 {masterOf(unitCandidates).filter(t=>t.frontage_mm!==null&&t.depth_mm!==null).map(t=><label key={t.id} style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>{t.name}（各階の最低戸数）<input aria-label={`${t.name}の各階最低戸数`} type="number" min={0} step={1} value={minimumTexts[t.id]??''} placeholder="指定なし" style={{width:90}} onChange={e=>{useVolumePlan.setState({confirmed:null});setMinimumTexts(v=>({...v,[t.id]:e.target.value}));setDraft(null);setComparison(null);setError('')}}/></label>)}
 </details>
 <button disabled={busy} onClick={calculate}>{busy?'配置を計算中…':'配置を計算'}</button>
 {busy&&<><p role="status">住戸・共用部の配置候補を比較しています。</p><button onClick={()=>{revision.current++;job.current?.cancel();job.current=null;setBusy(false)}}>計算を取消</button></>}
 {comparison&&current&&<section aria-label="配置案の比較"><h4>同じボリュームで比較</h4><p>推奨：{comparison.recommended??'なし'}。LDK・DKの縮小を避け、専有面積の合計を優先します。同面積では戸数、重複区間、階段・EVまでの距離を比較します。</p>
 <div aria-label="配置案の戸数・面積・構成比較" style={{display:'grid',gap:8}}>{Object.entries(comparison.options).map(([layout,option])=>{const m=layoutMetrics(option!.plans);const counts=Object.values(option!.plans).reduce<Record<string,number>>((counts,p)=>{for(const c of p.cells){const id=p.unitTypeIdsByCell?.[c.id]??'';const name=masterOf(unitCandidates).find(t=>t.id===id)?.name??'未分類';counts[name]=(counts[name]??0)+1}return counts},{});return <div key={layout} style={{border:'1px solid #ccd4dc',padding:8,borderRadius:4,fontSize:12}}><button aria-pressed={plan?.layout===layout} onClick={()=>{setDraft(option!);setValue('layoutText',layout as CorridorLayout);confirm(option!)}}>{layout}{plan?.layout===layout?' ✓':''}</button><p>全階 {m.units.toLocaleString()}戸</p><ul style={{paddingLeft:18}}>{Object.entries(counts).map(([name,count])=><li key={name}>{name}：{count}戸</li>)}</ul><div>ファミリー {(familyShare(option!.plans,masterOf(unitCandidates))*100).toFixed(1)}%</div><div>専有率※ {(m.rentableRatio*100).toFixed(1)}%</div><div>外形利用率 {(m.envelopeRatio*100).toFixed(1)}%</div><div>最小LDK/DK {m.minLivingM2?.toFixed(1)??'未確認'} m²</div></div>})}</div>
 <CirculationComparison options={Object.entries(comparison.options).map(([name,option])=>({name,metrics:layoutPreference(option!.plans)}))}/>
 {Object.entries(comparison.failures).map(([name,reason])=><p key={name}>{name}：{reason}</p>)}
 </section>}
 <EntryCheckPanel plan={plan??null}/>
 {current&&<details open><summary>住戸の自動調整結果</summary>
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
 </section>
}
