import {useEffect,useRef,useState} from 'react'
import type {Point} from '../geom/viewport'
import {outlineDimensions,resizeDimensions} from '../volume/resizeDimensions'
export function VolumeDimensions({footprint,focusRequest,onApply}:{footprint:readonly Point[]|null;focusRequest:number;onApply:(next:Point[])=>void}){
 const [width,setWidth]=useState(''),[depth,setDepth]=useState(''),[error,setError]=useState('')
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null)
 const cancel=()=>{if(timer.current!==null){clearTimeout(timer.current);timer.current=null}}
 useEffect(()=>cancel,[])
 const widthRef=useRef<HTMLInputElement>(null)
 const reset=()=>{cancel();if(footprint){const d=outlineDimensions(footprint);setWidth(String(Math.round(d.width*100)/100));setDepth(String(Math.round(d.depth*100)/100))}else{setWidth('');setDepth('')}setError('')}
 useEffect(reset,[footprint])
 useEffect(()=>{if(focusRequest){const group=widthRef.current?.closest('details');if(group)group.open=true;reset();widthRef.current?.focus();widthRef.current?.select()}},[focusRequest])
 const apply=(w=width,d=depth)=>{cancel();try{if(!footprint)throw Error('閉じた外形を作成してください');const current=outlineDimensions(footprint);if(Math.abs(current.width-Number(w))>0.01||Math.abs(current.depth-Number(d))>0.01)onApply(resizeDimensions(footprint,Number(w),Number(d)));setError('')}catch(e){setError(e instanceof Error?e.message:String(e))}}
 const schedule=(w:string,d:string)=>{cancel();if(Number(w)>0&&Number(d)>0)timer.current=setTimeout(()=>apply(w,d),500)}
 return <div aria-label="ボリュームの縦横寸法" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();apply()}if(e.key==='Escape'){e.preventDefault();reset();(e.target as HTMLElement).blur()}}}>
 <label>横幅（mm）<input ref={widthRef} type="number" min="1" step="any" disabled={!footprint} value={width} onChange={e=>{setWidth(e.target.value);schedule(e.target.value,depth)}} onBlur={()=>{if(timer.current!==null)apply()}}/></label>
 <label>奥行（mm）<input type="number" min="1" step="any" disabled={!footprint} value={depth} onChange={e=>{setDepth(e.target.value);schedule(width,e.target.value)}} onBlur={()=>{if(timer.current!==null)apply()}}/></label>
 {error&&<p role="alert" style={{color:'#a33'}}>{error}</p>}
 </div>
}
