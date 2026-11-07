import type { AutoPlan } from '../plan/autoPlan'
import { summarizePlacedUnits } from '../plan/placedUnitSummary'

export function PlacedUnitSummary({plans,types,selectedFloor,storeyCount}:{plans:Record<number,AutoPlan>;types:readonly {id:string;name:string}[];selectedFloor:number;storeyCount:number}){
 const summary=summarizePlacedUnits(plans,types,selectedFloor,storeyCount)
 return <section aria-label="配置住戸数" style={{display:'grid',gridTemplateColumns:'minmax(104px, 1fr) minmax(0, 1.2fr)',gap:10,marginBottom:14,alignItems:'stretch'}}>
  <div style={{background:'#eaf2fa',border:'1px solid #c2d4e5',borderRadius:8,padding:'12px 10px'}}>
   <div style={{fontSize:12,fontWeight:600}}>配置戸数{summary.unplannedFloors>0?'（作成済み階）':'（全階）'}</div>
   <div style={{margin:'8px 0',color:'#153958',fontVariantNumeric:'tabular-nums'}}><strong style={{fontSize:36,lineHeight:1.1}}>{summary.total===null?'—':summary.total.toLocaleString('ja-JP')}</strong>{summary.total!==null&&<span style={{fontSize:15,marginLeft:4}}>戸</span>}</div>
   <div style={{fontSize:12}}>{selectedFloor}階：{summary.selected===null?'未作成':`${summary.selected.toLocaleString('ja-JP')}戸`}</div>
   {summary.unplannedFloors>0&&<div style={{fontSize:11,marginTop:5,color:'#685a41'}}>未作成：{summary.unplannedFloors}階分</div>}
  </div>
  <div style={{border:'1px solid #ddd8cc',borderRadius:8,padding:'10px 8px',minWidth:0}}>
   <div style={{fontSize:12,fontWeight:600,marginBottom:6}}>住戸タイプ別</div>
   {summary.byType.length===0?<p style={{fontSize:12,margin:0,color:'#666'}}>{summary.total===null?'配置を作成すると表示':'配置住戸なし'}</p>:<ul style={{listStyle:'none',margin:0,padding:0,fontSize:13}}>{summary.byType.map(row=><li key={row.name} style={{display:'flex',justifyContent:'space-between',gap:8,padding:'4px 0',borderBottom:'1px solid #edf0f3'}}><span>{row.name}</span><strong style={{whiteSpace:'nowrap',fontVariantNumeric:'tabular-nums'}}>{row.count.toLocaleString('ja-JP')}戸</strong></li>)}</ul>}
  </div>
 </section>
}
