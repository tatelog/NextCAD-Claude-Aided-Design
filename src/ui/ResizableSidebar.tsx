import {useRef, type ReactNode, type CSSProperties} from 'react'
import {create} from 'zustand'
import {useLeftPanelWidth} from './LeftPanelResize'
export const useRightPanelWidth=create<{width:number;setWidth:(width:number)=>void}>(set=>({width:320,setWidth:width=>set({width:Math.max(220,Math.min(600,width))})}))
export function ResizableSidebar({side='right',children,style,className,label}:{side?:'left'|'right';children:ReactNode;style?:CSSProperties;className?:string;label?:string}){
 const left=useLeftPanelWidth(),right=useRightPanelWidth(),state=side==='left'?left:right
 const drag=useRef<{x:number;width:number}|null>(null)
 const sign=side==='left'?1:-1
 return <div className="resizable-sidebar" style={{position:'relative',minHeight:0,minWidth:0,height:'100%'}}>
 <aside className={className} aria-label={label} style={{...style,width:'100%',height:'100%',minHeight:0,boxSizing:'border-box',overflowY:'auto'}}>{children}</aside>
 <div role="separator" aria-label={`${side==='left'?'左':'右'}メニューの幅`} aria-orientation="vertical" aria-valuemin={side==='left'?180:220} aria-valuemax={side==='left'?480:600} aria-valuenow={state.width} tabIndex={0} title="ドラッグまたは左右キーで幅を変更" className="sidebar-resize-handle" style={{[side==='left'?'right':'left']:0}}
 onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();drag.current={x:e.clientX,width:state.width};e.currentTarget.setPointerCapture(e.pointerId)}}
 onPointerMove={e=>{if(drag.current)state.setWidth(drag.current.width+sign*(e.clientX-drag.current.x))}}
 onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}} onPointerCancel={()=>{drag.current=null}} onLostPointerCapture={()=>{drag.current=null}}
 onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();state.setWidth(state.width+sign*(e.key==='ArrowRight'?16:-16))}}}/>
 </div>
}
