import {useEffect,useRef,useState} from 'react'
import type {Point} from '../geom/viewport'
import {outlineDimensions,resizeDimensions} from '../volume/resizeDimensions'
export function VolumeDimensions({footprint,focusRequest,onApply}:{footprint:readonly Point[]|null;focusRequest:number;onApply:(next:Point[])=>void}){
 const [width,setWidth]=useState(''),[depth,setDepth]=useState(''),[error,setError]=useState('')
 const widthRef=useRef<HTMLInputElement>(null)
 const reset=()=>{if(footprint){const d=outlineDimensions(footprint);setWidth(String(Math.round(d.width*100)/100));setDepth(String(Math.round(d.depth*100)/100))}else{setWidth('');setDepth('')}setError('')}
 useEffect(reset,[footprint])
 useEffect(()=>{if(focusRequest){reset();widthRef.current?.focus();widthRef.current?.select()}},[focusRequest])
 const apply=()=>{try{if(!footprint)throw Error('閉じた外形を作成してください');onApply(resizeDimensions(footprint,Number(width),Number(depth)));setError('')}catch(e){setError(e instanceof Error?e.message:String(e))}}
 return <div aria-label="ボリュームの縦横寸法" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();apply()}if(e.key==='Escape'){e.preventDefault();reset();(e.target as HTMLElement).blur()}}}>
 <label>横幅（mm）<input ref={widthRef} type="number" min="1" step="any" disabled={!footprint} value={width} onChange={e=>setWidth(e.target.value)}/></label>
 <label>奥行（mm）<input type="number" min="1" step="any" disabled={!footprint} value={depth} onChange={e=>setDepth(e.target.value)}/></label>
 <button type="button" disabled={!footprint} onClick={apply}>寸法を反映</button>
 <p className="muted">平面の横・縦方向。中心を固定して伸縮します。点を選択 → Shift＋Tabで数値入力。Enterで反映、Escで取消。</p>
 {error&&<p role="alert" style={{color:'#a33'}}>{error}</p>}
 </div>
}
