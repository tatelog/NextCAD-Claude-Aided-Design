import {useState} from 'react'
import type {Point} from '../geom/viewport'
import type {SlopeBoundary} from '../volume/slope'
import {useTutorial,tutorialDone} from './state'
import {tutorialSteps} from './steps'
import {useP3Input} from '../store/p3Input'
import {compactPlan} from './compactPlan'
export function VolumeGuide({footprint,lot,boundaries,storeys,height,onApply}:{footprint:Point[]|null;lot:Point[];boundaries:SlopeBoundary[];storeys:number;height:number;onApply:(next:Point[])=>void}){
 const {active,index}=useTutorial(),target=tutorialSteps[index]?.target
 const [draft,setDraft]=useState<ReturnType<typeof compactPlan>|null>(null),[error,setError]=useState('')
 if(!active||target!=='tutorial-fit')return null
 return <section data-tutorial={target} style={{padding:10,border:'2px solid #2876cb',borderRadius:8,marginBottom:10}}>
 <h3>中廊下型の寸法案</h3>
 <button onClick={()=>{try{if(!footprint)throw Error('外形を描いてください');setDraft(compactPlan(footprint,lot,boundaries,storeys,height));setError('')}catch(e){setError(e instanceof Error?e.message:String(e))}}}>余り面積の少ない寸法案を計算</button>
 {draft&&<><p>横幅 {draft.width.toLocaleString()} mm／奥行 {draft.depth.toLocaleString()} mm</p><p>住戸奥行 {draft.unitDepth} mm×2＋中廊下 1,600 mm</p><p>全階 {draft.units}戸／未配置面積 {draft.unused.toFixed(1)}㎡（{(draft.ratio*100).toFixed(1)}%）</p><small>同じ位置で寸法候補を比較した計画案です。共用部を確保した残りの面積で比較します。</small><button onClick={()=>{try{onApply(draft.footprint);const set=useP3Input.getState().setValue;set('layoutText','中廊下');set('unitDepthText',String(draft.unitDepth));set('spanText','3000');set('corridorText','1600');tutorialDone(target)}catch(e){setError(e instanceof Error?e.message:String(e))}}}>この縦横寸法を反映</button></>}
 {error&&<p role="alert">{error}</p>}
 </section>
}
