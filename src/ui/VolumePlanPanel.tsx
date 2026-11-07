import {tutorialSteps} from '../tutorial/steps'
import {parseMinimumUnits} from '../plan/minimumUnitsInput'
import {familyShare,currentFamilyShare} from '../plan/familyShare'
import {useFloorPlans} from '../store/floorPlans'
import {masterOf} from '../plan/unitTypeMaster'
import unitCandidates from '../plan/unitTypeCandidates.json'
import {layoutMetrics} from '../plan/layoutQuality'
import {layoutPreference} from '../plan/layoutPreference'
import {CirculationComparison} from './CirculationComparison'
import type {CorridorLayout} from '../plan/candidateCells'
import {corridorForCell} from '../plan/planCorridors'
import {UnitPlanDrawing} from './UnitPlanDrawing'
import {useTutorial,tutorialDone} from '../tutorial/state'
import {useState,useEffect,useRef} from 'react'
import {startVolumeCalculation} from '../plan/volumeCalculation'
import {useSite} from '../store/site'
import {useP3Input} from '../store/p3Input'
import {compareVolumePlans,useVolumePlan,type VolumePlan} from '../plan/volumePlan'
import {CirculationLayer} from './CirculationLayer'
export function VolumePlanPanel(){
 const tutorialActive=useTutorial(s=>s.active)
 const choosingLayout=useTutorial(s=>s.active&&tutorialSteps[s.index]?.target==='tutorial-fit')
 const volume=useSite(s=>s.volume),boundaries=useSite(s=>s.slopeBoundaries)
 const {values:v,setValue}=useP3Input()
 const {confirmed,confirm}=useVolumePlan()
 const [comparison,setComparison]=useState<ReturnType<typeof compareVolumePlans>|null>(null)
 const [draft,setDraft]=useState<VolumePlan|null>(null),[error,setError]=useState('')
 const [minimumTexts,setMinimumTexts]=useState<Record<string,string>>({})
 const [people,setPeople]=useState('3'),[residents,setResidents]=useState('')
 const signature=JSON.stringify([volume,boundaries,volume?.storey_count,volume?.storey_height])
 const [familyBaseline,setFamilyBaseline]=useState<number|null>(()=>currentFamilyShare(useFloorPlans.getState(),confirmed,signature,masterOf(unitCandidates)))
 const [busy,setBusy]=useState(false)
 const job=useRef<ReturnType<typeof startVolumeCalculation>|null>(null)
 const revision=useRef(0)
 const calculationKey=JSON.stringify([signature,v.layoutText,v.spanText,v.corridorText,v.unitDepthText,people,residents,tutorialActive,minimumTexts])
 useEffect(()=>{revision.current++;job.current?.cancel();job.current=null;setBusy(false);return ()=>{revision.current++;job.current?.cancel()}},[calculationKey])
 const calculate=async()=>{
  job.current?.cancel();const id=++revision.current;setDraft(null);setComparison(null);setError('')
  if(!volume){setError('ボリューム外形がありません');return}
  setBusy(true)
  try{
   const pending=startVolumeCalculation([volume,boundaries??[],{layout:v.layoutText,span:Number(v.spanText),corridor:Number(v.corridorText),unitDepth:Number(v.unitDepthText),people:Number(people),residents:residents.trim()?Number(residents):undefined,uniformDepth:false,minimumUnitsPerFloor:parseMinimumUnits(minimumTexts),minimumFamilyRatio:familyBaseline??undefined}]);job.current=pending
   const compared=await pending.result;if(id!==revision.current)return
   setComparison(compared);setDraft(compared.options[v.layoutText]??null)
   const selected=compared.options[v.layoutText]
   if(familyBaseline===null&&selected)setFamilyBaseline(familyShare(selected.plans,masterOf(unitCandidates)))
   if(!compared.options[v.layoutText])setError(compared.failures[v.layoutText]??'配置できません')
  }catch(e){if(id===revision.current)setError(e instanceof Error?e.message:String(e))}
  finally{if(id===revision.current){setBusy(false);job.current=null}}
 }
 const current=draft?.source===signature?draft:null
 const plan=current?.plans[1]
 const change=(key:'spanText'|'corridorText'|'unitDepthText'|'layoutText',value:string)=>{setDraft(null);setComparison(null);setValue(key,value as typeof v[typeof key])}
 return <section data-tutorial="tutorial-plan" aria-label="平面へ引き継ぐ配置" style={{border:'1px solid #ccc',padding:8,margin:'12px 0'}}>
 <h3>平面へ引き継ぐ配置</h3><p>柱割り・廊下・階段・EV・縦シャフトをここで確認します。住戸タイプは利用可能な範囲へ自動割付します。</p>
 <p>ファミリー住戸（2LDK以上）の割合：{familyBaseline===null?'現在案がないため、最初の計算案を基準にします':`${(familyBaseline*100).toFixed(1)}%以上を維持します`}。建物全体の戸数で比較します。</p>
 {v.layoutText==='ツイン'&&<p>左右の住戸列と廊下を吹抜けで分け、両端で接続します。住戸データの奥行も比較して自動調整します。</p>}
 <label data-tutorial="tutorial-fit" style={{display:'block'}}>廊下タイプ<select value={choosingLayout?'':v.layoutText} onChange={e=>{change('layoutText',e.target.value);tutorialDone('tutorial-fit')}}>{choosingLayout&&<option value="" disabled>廊下タイプを選択</option>}<option>中廊下</option><option>片廊下</option><option>ツイン</option><option disabled value="階段室">階段室型（自動配置未対応）</option></select></label>
 {([['spanText','スパン'],['corridorText','廊下幅'],['unitDepthText','住戸奥行']] as const).map(([key,label])=><label key={key} style={{display:'block'}}>{label}（mm）<input value={v[key]} onChange={e=>change(key,e.target.value)}/></label>)}
 <label style={{display:'block'}}>1戸あたり人数<input value={people} onChange={e=>{setPeople(e.target.value);setDraft(null)}}/></label><label style={{display:'block'}}>全階の想定人数（空欄で自動）<input value={residents} onChange={e=>{setResidents(e.target.value);setDraft(null)}}/></label>
 <details><summary>住戸構成の条件</summary><p>各階で確保する最低戸数です。空欄・0は指定なし。外形や共用部との調整後も満たす候補を比較します。</p>
 {masterOf(unitCandidates).filter(t=>t.frontage_mm!==null&&t.depth_mm!==null).map(t=><label key={t.id} style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>{t.name}（各階の最低戸数）<input aria-label={`${t.name}の各階最低戸数`} type="number" min={0} step={1} value={minimumTexts[t.id]??''} placeholder="指定なし" style={{width:90}} onChange={e=>{setMinimumTexts(v=>({...v,[t.id]:e.target.value}));setDraft(null);setComparison(null);setError('')}}/></label>)}
 </details>
 <button disabled={busy} onClick={calculate}>{busy?'配置を計算中…':'配置を計算'}</button>
 {busy&&<><p role="status">住戸・共用部の配置候補を比較しています。</p><button onClick={()=>{revision.current++;job.current?.cancel();job.current=null;setBusy(false)}}>計算を取消</button></>}
 {comparison&&current&&<section aria-label="配置案の比較"><h4>同じボリュームで比較</h4><p>推奨：{comparison.recommended??'なし'}。LDK・DKの縮小を避け、専有面積の合計を優先します。同面積では戸数、重複区間、階段・EVまでの距離を比較します。</p>
 <div style={{overflowX:'auto'}}><table aria-label="配置案の戸数・面積・構成比較" style={{fontSize:12,width:'100%',whiteSpace:'nowrap'}}><thead><tr><th>案</th><th>全階戸数</th><th>ファミリー割合</th><th>専有率※</th><th>外形利用率</th><th>最小LDK/DK</th></tr></thead><tbody>{Object.entries(comparison.options).map(([layout,option])=>{const m=layoutMetrics(option!.plans);return <tr key={layout}><th><button onClick={()=>{setDraft(option!);setValue('layoutText',layout as CorridorLayout)}}>{layout}{plan?.layout===layout?' ✓':''}</button></th><td>{m.units.toLocaleString()}戸</td><td>{(familyShare(option!.plans,masterOf(unitCandidates))*100).toFixed(1)}%</td><td>{(m.rentableRatio*100).toFixed(1)}%</td><td>{(m.envelopeRatio*100).toFixed(1)}%</td><td>{m.minLivingM2?.toFixed(1)??'未確認'} m²</td></tr>})}</tbody></table></div>
 <p style={{fontSize:11}}>※ 専有率＝住戸区画面積÷（各階外形面積−吹抜け）。概算レンタブル比です。外形利用率は吹抜けを除かず比較します。法定床面積・内法面積とは異なります。</p>
 <CirculationComparison options={Object.entries(comparison.options).map(([name,option])=>({name,metrics:layoutPreference(option!.plans)}))}/>
 {Object.entries(comparison.failures).map(([name,reason])=><p key={name}>{name}：{reason}</p>)}
 {plan&&(()=>{const m=layoutMetrics(current.plans);return <p>全階の専有 {m.privateM2.toFixed(1)} m²／共用 {m.commonM2.toFixed(1)} m²／未割付 {m.unassignedM2.toFixed(1)} m²。LDK/DKの最小短辺 {m.minLivingShortMm?.toLocaleString()??'未確認'} mm。</p>})()}
 </section>}
 {plan&&<><svg aria-label="引継ぎ配置の確認図" viewBox={`-500 -500 ${plan.widthMm+1000} ${plan.depthMm+1000}`} style={{width:'100%',height:'clamp(360px, 70vh, 720px)',background:'#fff'}}><rect width={plan.widthMm} height={plan.depthMm} fill="none" stroke="#456" strokeWidth="70"/>{plan.cells.map(c=><rect key={c.id} x={c.x0} y={c.y0} width={c.x1-c.x0} height={c.y1-c.y0} fill="#dbe7ed" stroke="#789" strokeWidth="30"/>)}{plan.cells.map(c=><UnitPlanDrawing key={`detail-${c.id}`} typeId={plan.unitTypeIdsByCell?.[c.id]??''} override={plan.unitPlanOverrides?.[c.id]} cell={c} corridor={corridorForCell(plan,c)}/>)}<CirculationLayer plan={plan}/></svg>{plan.layout==='ツイン'&&<p>採用した住戸帯の奥行：{plan.corridor.x0.toLocaleString()} mm ／ 吹抜け幅：{((plan.voids?.[0]?.x1??0)-(plan.voids?.[0]?.x0??0)).toLocaleString()} mm</p>}<p>階段 {plan.cores.filter(c=>c.id!=='evHall').length}か所・EV {plan.circulation?.evCount??'未確定'}台／全階 {Object.values(current!.plans).reduce((n,p)=>n+p.cells.length,0)}戸</p><button disabled={!Object.values(current!.plans).some(p=>p.cells.length>0)} onClick={()=>{confirm(current!);tutorialDone('tutorial-plan')}}>この配置を平面へ引き継ぐ</button></>}
 {current&&<details open><summary>住戸の自動調整結果</summary><p>面積を維持し、水回り・動線・家具の条件を満たす候補だけ採用します。</p>{Object.entries(current.plans).map(([floor,p])=>Object.keys(p.automaticUnitRejections??{}).length>0&&<details key={floor}><summary>{floor}階：配置できない候補があります</summary>{Object.entries(p.automaticUnitRejections??{}).map(([id,reasons])=><details key={id}><summary>{id}：{reasons[0]}</summary><ul>{reasons.map((r,i)=><li key={i}>{r}</li>)}</ul></details>)}</details>)}</details>}
 <p>{confirmed?.source===signature?'配置確認済み：P3では柱割り・共用部・シャフトを固定':'配置未確認：計算結果を確認してから引き継いでください'}</p>
 {plan&&plan.shafts.ps<plan.cells.length&&<p style={{color:"#a64b00"}}>PS未配置の住戸があります。水回りと縦シャフトの接続は要確認です。</p>}
 <small>計画配置の確認です。法規・構造・設備の適合確定ではありません。</small>{error&&<p role="alert">{error}</p>}
 </section>
}
