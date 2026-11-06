import {useRef,useState,type CSSProperties} from 'react'
import {PenToolbar,type PenToolbarProps} from './PenToolbar'
import {toolbarDock,type DockEdge} from './toolbarDock'
import {useUi} from '../store/ui'

export function DockedPenToolbar(props:PenToolbarProps) {
 const placement=useUi(s=>s.toolbarPlacement)
 const [dock,setDock]=useState<DockEdge|null>(placement==='free'?null:placement)
 const [preview,setPreview]=useState<DockEdge|null>(null)
 const [position,setPosition]=useState({x:16,y:64})
 const [moving,setMoving]=useState(false)
 const previousPlacement=useRef(placement)
 if(previousPlacement.current!==placement){previousPlacement.current=placement;setDock(placement==='free'?null:placement)}
 const root=useRef<HTMLDivElement>(null)
 const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null)
 const vertical=!moving && (dock==='left'||dock==='right')
 const style:CSSProperties=moving||!dock ? {left:position.x,top:position.y} : dock==='left'?{left:0,top:0}:dock==='right'?{right:0,top:0}:dock==='top'?{left:0,top:0}:{left:0,bottom:0}
 return <>
 {preview && <div className={`toolbar-dock-preview dock-${preview}`} />}
 <div ref={root} className={`docked-pen ${vertical?'vertical':'horizontal'}`} style={style}>
 <button className="dock-grip" aria-label="作図ツールを移動" title="つかんで移動・端で固定"
 onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();const r=root.current!.getBoundingClientRect();const p=root.current!.parentElement!.getBoundingClientRect();drag.current={x:e.clientX,y:e.clientY,left:r.left-p.left,top:r.top-p.top};setPosition({x:r.left-p.left,y:r.top-p.top});setMoving(true);e.currentTarget.setPointerCapture(e.pointerId)}}
 onPointerMove={e=>{const d=drag.current;if(!d)return;const p=root.current!.parentElement!.getBoundingClientRect();setPosition({x:Math.max(0,Math.min(p.width-root.current!.offsetWidth,d.left+e.clientX-d.x)),y:Math.max(0,Math.min(p.height-root.current!.offsetHeight,d.top+e.clientY-d.y))});setPreview(toolbarDock(e.clientX-p.left,e.clientY-p.top,p.width,p.height))}}
 onPointerUp={e=>{if(!drag.current)return;const p=root.current!.parentElement!.getBoundingClientRect();setDock(toolbarDock(e.clientX-p.left,e.clientY-p.top,p.width,p.height));drag.current=null;setMoving(false);setPreview(null)}}
 onPointerCancel={()=>{drag.current=null;setMoving(false);setPreview(null)}}><span /></button>
 <button className="dock-close" title="閉じる" aria-label="作図ツールを閉じる" onClick={props.onClose}>×</button>
 <PenToolbar {...props} compact placement={vertical?'left':'top'} />
 </div></>
}
