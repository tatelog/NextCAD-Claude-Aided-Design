import type {AutoPlan} from '../plan/autoPlan'
import {balconyRailSegments} from '../plan/balconyPlan'
export function BalconyLayer({plan}:{plan:AutoPlan}){
 const all=plan.balconies??[]
 return <g aria-label="バルコニーの配置" pointerEvents="none">{all.map(b=><g key={b.id}>
  <rect x={b.x0} y={b.y0} width={b.x1-b.x0} height={b.y1-b.y0} fill="#e4f0dd" stroke="#688367" strokeWidth={25}><title>{b.unitId} バルコニー 奥行{b.depthMm} mm／{((b.x1-b.x0)*(b.y1-b.y0)/1e6).toFixed(2)} m²</title></rect>
  {balconyRailSegments(b,all).map(([a,z],i)=><line key={i} x1={a!.x} y1={a!.y} x2={z!.x} y2={z!.y} stroke="#405d41" strokeWidth={65}><title>手すり（仕様未確定）</title></line>)}
  {all.filter(o=>o.id!==b.id&&Math.abs(o.y1-b.y0)<1&&Math.min(o.x1,b.x1)>Math.max(o.x0,b.x0)).map(o=><line key={o.id} x1={Math.max(o.x0,b.x0)} x2={Math.min(o.x1,b.x1)} y1={b.y0} y2={b.y0} stroke="#946f40" strokeWidth={40} strokeDasharray="150 70"><title>戸境隔て板（仕様・避難計画未確定）</title></line>)}
  {b.access&&<g><line x1={b.access.x} x2={b.access.x} y1={b.access.y0} y2={b.access.y1} stroke="white" strokeWidth={80}/><line x1={b.access.x-40} x2={b.access.x-40} y1={b.access.y0} y2={b.access.y1} stroke="#267ba4" strokeWidth={25}/><line x1={b.access.x+40} x2={b.access.x+40} y1={b.access.y0} y2={b.access.y1} stroke="#267ba4" strokeWidth={25}/><title>掃き出し引戸の計画候補（建具仕様・家具干渉は要確認）</title></g>}
  <text x={(b.x0+b.x1)/2} y={(b.y0+b.y1)/2} textAnchor="middle" fontSize={160} fill="#405d41" transform={`rotate(-90 ${(b.x0+b.x1)/2} ${(b.y0+b.y1)/2})`}>バルコニー {b.depthMm}</text>
 </g>)}</g>
}
