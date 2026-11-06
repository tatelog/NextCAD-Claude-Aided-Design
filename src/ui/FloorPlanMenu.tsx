import type { Point } from '../geom/viewport'
import type { AutoPlan } from '../plan/autoPlan'
import type { UnitType } from '../plan/unitTypeMaster'
const PATTERNS = [
 ['均一', ['2LDK','2LDK','2LDK']],
 ['交互', ['1LDK','2LDK','1LDK','2LDK']],
 ['ファミリー混合', ['3LDK','2LDK','2LDK','3LDK']],
 ['大小混合', ['1K','1LDK','2LDK','3LDK']],
] as const
export function FloorPlanMenu({floors,plans,widthMm,depthMm,selected,onSelect,types,pattern,onPattern,onApply}: {
 floors: Point[][]; plans: Record<number,AutoPlan>; widthMm:number; depthMm:number; selected:number; onSelect:(floor:number)=>void;
 types:readonly UnitType[]; pattern:string[]; onPattern:(ids:string[])=>void; onApply:()=>void
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
  <details open style={{marginTop:18}}><summary style={{fontSize:14,fontWeight:700,cursor:"pointer",padding:"8px 0"}}>住戸構成パターン</summary>
  <p style={{fontSize:11}}>住戸タイプの並びを選んで再配置します。サムネイルは並び方の模式図です。</p>
  {PATTERNS.map(([label,names])=>{const ids=names.map(name=>types.find(t=>t.name===name)?.id).filter((id):id is string=>!!id);return <button key={label} type="button" aria-pressed={ids.join()===pattern.join()} onClick={()=>onPattern(ids)} style={{display:'block',width:'100%',marginBottom:6,textAlign:'left',padding:6}}><strong>{label}</strong><svg viewBox="0 0 180 76" style={{display:'block',width:'100%',height:76}} aria-hidden="true">{[0,1,2].map(row=>names.map((name,k)=><g key={`${row}-${k}`}><rect x={k*180/names.length+2} y={row*24+2} width={180/names.length-4} height={20} rx={2} fill={name==='1K'?'#d9e8df':name==='1LDK'?'#d9e6f2':name==='2LDK'?'#b6cce0':'#c6bddc'}/>{row===1&&<text x={(k+.5)*180/names.length} y={row*24+16} textAnchor="middle" fontSize="9" fill="#243953">{name}</text>}</g>))}</svg><small>{names.join(' ｜ ')}</small></button>})}
  <button type="button" onClick={onApply} disabled={!floors.length} style={{width:'100%',marginTop:8}}>このパターンで各階を再配置</button>
  </details>
 </div>
}
