import {useEffect,useRef} from 'react'
import {createPortal} from 'react-dom'
import './CalculationOverlay.css'
/** モーダルで背景のクリック・キーボード操作を止め、計算終了時に元のフォーカスへ戻す。 */
export function CalculationOverlay(){
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const dialog=ref.current;if(!dialog)return;dialog.showModal();return()=>dialog.close()},[])
 return createPortal(<dialog ref={ref} className="calculation-overlay" aria-label="平面を計算中" onCancel={e=>e.preventDefault()}>
 <div role="status" aria-live="polite" aria-busy="true"><span className="calculation-spinner" aria-hidden="true"/><strong>計算中…</strong><p>平面の配置を作成しています。しばらくお待ちください。</p></div>
 </dialog>,document.body)
}
