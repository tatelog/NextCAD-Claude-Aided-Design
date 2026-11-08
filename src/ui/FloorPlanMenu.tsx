import {VolumePlanPanel} from './VolumePlanPanel'
import type { Point } from '../geom/viewport'
import type { AutoPlan } from '../plan/autoPlan'
export function FloorPlanMenu({floors,plans,widthMm,depthMm,selected,onSelect,readOnly=false}: {
 floors: readonly (readonly Point[])[]; plans: Record<number,AutoPlan>; widthMm:number; depthMm:number; selected:number; onSelect:(floor:number)=>void; readOnly?:boolean;
}) {
 return <div style={{padding:10}}>
  <details open>
  <summary style={{fontSize:14,fontWeight:700,cursor:"pointer",padding:"8px 0"}}>各階レイアウト</summary>
  <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:6}}>
   {floors.map((outline,index)=>{const floor=index+1,plan=plans[floor];return <button key={floor} type="button" aria-label={`${floor}階のレイアウト`} aria-pressed={selected===floor} onClick={()=>onSelect(floor)} style={{padding:5,border:selected===floor?'2px solid #243953':'1px solid #d7dbe1',borderRadius:5,background:selected===floor?'#edf2f7':'white',color:'#243953'}}>
    <svg viewBox={`-500 -500 ${widthMm+1000} ${depthMm+1000}`} style={{width:'100%',height:90}} aria-hidden="true">
     <polygon points={outline.map(p=>`${p.x},${p.y}`).join(' ')} fill="#f1f3f5" stroke="#788697" strokeWidth={1} vectorEffect="non-scaling-stroke"/>
     {plan?.cells.map(c=><rect key={c.id} x={c.x0} y={c.y0} width={c.x1-c.x0} height={c.y1-c.y0} fill="#b9cbdc" stroke="#fff" strokeWidth={0.5} vectorEffect="non-scaling-stroke"/>)}
    </svg>
    <div>{floor}階</div><small>{outline.length<3?'床なし':plan?`${plan.cells.length}戸・配置案`:'未配置'}</small>
   </button>})}
  </div>
  </details>
  {!readOnly&&<VolumePlanPanel />}
 </div>
}
