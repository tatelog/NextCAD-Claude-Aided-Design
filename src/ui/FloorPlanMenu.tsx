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
  <h2 style={{fontSize:14,marginTop:18}}>住戸構成パターン</h2>
  <p style={{fontSize:11}}>横にタイプを組み合わせ、同じ列を上下階で揃えます。</p>
  {PATTERNS.map(([label,names])=>{const ids=names.map(name=>types.find(t=>t.name===name)?.id).filter((id):id is string=>!!id);return <button key={label} type="button" onClick={()=>onPattern(ids)} style={{display:'block',width:'100%',marginBottom:6,textAlign:'left',padding:6}}>{label}<br/><small>{names.join(' ｜ ')}</small></button>})}
  <label style={{fontSize:12}}>選択中の列構成</label>
  {pattern.map((id,index)=><select key={index} aria-label={`${index+1}列目の住戸タイプ`} value={id} onChange={e=>onPattern(pattern.map((v,i)=>i===index?e.target.value:v))} style={{width:'100%',marginBottom:4}}>{types.map(t=><option key={t.id} value={t.id}>{index+1}列目：{t.name}</option>)}</select>)}
  <button type="button" onClick={()=>onPattern([...pattern,types[0]!.id])}>列を追加</button>
  <button type="button" disabled={pattern.length<=1} onClick={()=>onPattern(pattern.slice(0,-1))}>末尾を削除</button>
  <button type="button" onClick={onApply} disabled={!floors.length} style={{width:'100%',marginTop:8}}>この構成で各階の配置案を作る</button>
 </div>
}
