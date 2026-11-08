import {useTutorial} from './state'
import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {tutorialSteps} from './steps'
import {saveDismissed,shouldStart} from './progress'
const storage={getItem:(key:string)=>window.localStorage.getItem(key),setItem:(key:string,value:string)=>window.localStorage.setItem(key,value)}
export function Tutorial({screen}:{screen:string}){
 const {active,setActive,index,setIndex}=useTutorial()
 useEffect(()=>{if(shouldStart(storage))setActive(true)},[setActive])
 useEffect(()=>{const start=()=>{setIndex(0);setActive(true)};window.addEventListener('tutorial-start',start);return()=>window.removeEventListener('tutorial-start',start)},[setIndex,setActive])
 const [rect,setRect]=useState<DOMRect|null>(null),[viewport,setViewport]=useState({width:window.innerWidth,height:window.innerHeight})
 const card=useRef<HTMLDivElement>(null)
 const step=tutorialSteps[index]!
 const stop=()=>{saveDismissed(storage);setActive(false)}
 useEffect(()=>{if(active)saveDismissed(storage)},[active])
 useEffect(()=>{if(!active)return;const i=tutorialSteps.findIndex(s=>s.screen===screen);if(i>=0&&tutorialSteps[index]?.screen!==screen)setIndex(i)},[screen,active,index])
 useEffect(()=>{
  if(!active)return
  const target=document.querySelector<HTMLElement>(`[data-tutorial="${step.target}"]`)
  const update=()=>{const r=document.querySelector<HTMLElement>(`[data-tutorial="${step.target}"]`)?.getBoundingClientRect()??null;setRect(old=>old?.x===r?.x&&old?.y===r?.y&&old?.width===r?.width&&old?.height===r?.height?old:r);setViewport(old=>old.width===window.innerWidth&&old.height===window.innerHeight?old:{width:window.innerWidth,height:window.innerHeight})}
  target?.scrollIntoView({block:'nearest',inline:'nearest'})
  update();const observer=new ResizeObserver(update);if(target)observer.observe(target)
  window.addEventListener('tutorial-target-change',update)
  window.addEventListener('resize',update);window.addEventListener('scroll',update,true)
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();saveDismissed(storage);setActive(false)}}
  window.addEventListener('keydown',escape)
  return()=>{observer.disconnect();window.removeEventListener('tutorial-target-change',update);window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);window.removeEventListener('keydown',escape)}
 },[active,index,screen,step])
 useEffect(()=>{
  if(!active)return
  const advance=()=>{if(step.target==='site-selected')setIndex(index+1)}
  window.addEventListener('tutorial-site-inspected',advance)
  const action=(e:Event)=>{if((e as CustomEvent).detail===step.target)setIndex(Math.min(index+1,tutorialSteps.length-1))}
  window.addEventListener('tutorial-action',action)
  const allowed=(target:EventTarget|null)=>target instanceof Element&&(!!target.closest('[data-tutorial-controls]')||!!target.closest('[data-tutorial-exit]')||!!target.closest('[role=alert]')||((screen==='P3'||screen==='P4')&&!!target.closest('[data-tutorial-review]'))||(step.target!=='site-selected'&&!!target.closest(`[data-tutorial="${step.target}"]`)&&(step.target!=='tutorial-draw'||!target.closest('button')||!!target.closest('[aria-label="オブジェクトの寸法入力"]'))))
  const block=(e:Event)=>{if(screen==='P5'&&e.target instanceof HTMLAnchorElement&&e.target.download&&e.target.href.startsWith('blob:'))return;if(e.type==='wheel'&&(screen==='P3'||screen==='P4'))return;if(e instanceof KeyboardEvent&&(e.ctrlKey||e.metaKey)){e.preventDefault();e.stopImmediatePropagation();return}if(allowed(e.target))return;if(e instanceof KeyboardEvent&&e.key==='Escape')return;e.preventDefault();e.stopImmediatePropagation()}
  const events=['pointerdown','pointerup','mousedown','mouseup','click','dblclick','wheel','touchstart','touchmove','keydown','keyup','contextmenu']
  events.forEach(name=>window.addEventListener(name,block,{capture:true,passive:false}))
  const focus=(e:FocusEvent)=>{if(!allowed(e.target))card.current?.querySelector<HTMLButtonElement>('button')?.focus()}
  window.addEventListener('focusin',focus,true)
  if(!allowed(document.activeElement))card.current?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true})
  return()=>{window.removeEventListener('tutorial-site-inspected',advance);window.removeEventListener('tutorial-action',action);events.forEach(name=>window.removeEventListener(name,block,true));window.removeEventListener('focusin',focus,true)}
 },[active,step])
 if(!active)return null
 const width=Math.min(320,viewport.width-24)
 const left=rect&&rect.width<viewport.width*.6&&rect.left>width+32?rect.left-width-28:Math.max(12,viewport.width-width-330)
 const top=Math.max(70,Math.min(rect?rect.top+20:100,viewport.height-300))
 const stopBeforeTarget=false
 const x=rect?Math.max(8,Math.min(viewport.width-8,stopBeforeTarget?rect.left-10:rect.left+rect.width/2)):left
 const y=rect?Math.max(8,Math.min(viewport.height-8,rect.top+(step.target==='site-selected'?rect.height:Math.min(rect.height/2,120)))):top
 const correct=step.screen===screen
 return createPortal(<>
 {step.target==='site-selected'&&rect&&correct&&<button data-tutorial-controls aria-label="選択済み敷地をダブルクリック" onDoubleClick={()=>window.dispatchEvent(new Event('tutorial-inspect-selected'))} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();window.dispatchEvent(new Event('tutorial-inspect-selected'))}}} style={{position:'fixed',left:x-28,top:y-40,width:56,height:56,zIndex:91,background:'transparent',border:'2px dashed #2876cb',borderRadius:8,cursor:'pointer'}}/>}

 {rect&&correct&&<svg aria-hidden="true" style={{position:'fixed',inset:0,width:'100%',height:'100%',zIndex:89,pointerEvents:'none'}}><rect x={rect.x+2} y={rect.y+2} width={Math.max(0,rect.width-4)} height={Math.max(0,rect.height-4)} rx="6" fill="none" stroke="#2876cb" strokeWidth="3"/><path d={`M ${left+width/2} ${top+22} L ${x} ${y}`} stroke="#2876cb" strokeWidth="2" fill="none"/><circle cx={x} cy={y} r="5" fill="#2876cb"/></svg>}
 <div data-tutorial-controls ref={card} role="region" aria-label="チュートリアル" aria-live="polite" style={{position:'fixed',left:Math.min(left,viewport.width-width-12),top,width,boxSizing:'border-box',padding:18,zIndex:90,background:'#fff',color:'#203149',border:'2px solid #2876cb',borderRadius:12,boxShadow:'0 6px 24px #20314926',fontSize:14,maxHeight:'calc(100vh - 90px)',overflowY:'auto'}}>
 <div style={{fontSize:12,color:'#466b94'}}>チュートリアル　{index+1} / {tutorialSteps.length}</div><h3 style={{margin:'8px 0'}}>{correct?step.title:'案内を一時中断しています'}</h3><p style={{lineHeight:1.7}}>{correct?step.body:'敷地またはボリューム画面に戻ると案内を続けられます。'}</p>
 <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button onClick={stop}>チュートリアルを終了</button>{index===tutorialSteps.length-1&&correct&&<button onClick={stop}>完了</button>}</div>
 <p style={{fontSize:11,color:'#65758a',marginBottom:0}}>終了後は自動表示しません。ヘッダーの初心者マークから再開できます。</p>
 </div></>,document.body)
}
