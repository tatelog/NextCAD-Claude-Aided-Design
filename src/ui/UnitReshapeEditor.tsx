import {availableUsage} from '../plan/partitionConstraints'
import {useMemo,useState} from 'react'
import type {UnitPlan39} from '../plan/unitPlan39'
import {defaultLayoutRules,reshapeUnit,validateUnitLayout} from '../plan/reshapeUnit'
export function UnitReshapeEditor({source,onApply}:{source:UnitPlan39;onApply?:(plan:UnitPlan39)=>string|null}){
 const [width,setWidth]=useState(source.envelope.W),[rules,setRules]=useState(defaultLayoutRules),[message,setMessage]=useState('')
 const result=useMemo(()=>{try{return reshapeUnit(source,width,rules)}catch(e){return {plan:source,issues:[{code:'input',message:String(e),x:0,y:0}],valid:false}}},[source,width,rules])
 const original=useMemo(()=>validateUnitLayout(source,rules),[source,rules]),p=result.plan
 return <details><summary>面積を保って住戸を変形・動線を確認</summary>
 <p>水回りの幅・奥行と柱中心を固定し、共有する間仕切りを再配置します。設備・家具は縮小せず、移動・90°回転で配置します。設計条件に対する幾何チェックです。</p>
 <label>間口（mm）<input aria-label="変形後の間口" type="number" min={500} max={30000} value={width} onChange={e=>setWidth(Number(e.target.value))}/></label>
 <p>奥行 {p.envelope.D.toLocaleString('ja-JP',{maximumFractionDigits:1})} mm ／ 面積 {(p.envelope.W*p.envelope.D/1e6).toFixed(2)} m²</p>
 <label>設計通路幅（mm）<input type="number" min={300} max={2000} value={rules.passage} onChange={e=>setRules({...rules,passage:Math.max(300,Number(e.target.value))})}/></label>
 <p>トイレ {rules.toiletWidth}×{rules.toiletDepth} mm、居室最小幅 {rules.roomWidth} mm・面積 {rules.roomArea} m²。浴室は元案の寸法を下限にします。</p>
 <svg aria-label="住戸変形プレビュー" viewBox={`-200 -200 ${p.envelope.W+400} ${p.envelope.D+400}`} style={{width:'100%',height:350,touchAction:'none'}}>
 {p.rooms.map(r=><g key={r.id}><rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#d9e8ef" fillOpacity={.65} stroke="#687e91" strokeWidth={25}/><text x={r.x+r.w/2} y={r.y+r.h/2} textAnchor="middle" fontSize={150}>{r.name}</text></g>)}
 {p.fixtures.map(f=><g key={f.id}><rect x={f.x} y={f.y} width={f.w} height={f.h} fill="white" stroke="#657989" strokeWidth={20}/><text x={f.x+f.w/2} y={f.y+f.h/2} fontSize={100} textAnchor="middle">{f.kind}</text></g>)}
 {p.fixtures.map(f=>{const room=p.rooms.find(r=>f.x>=r.x&&f.y>=r.y&&f.x+f.w<=r.x+r.w+1&&f.y+f.h<=r.y+r.h+1);const a=room?availableUsage(f,room,p.fixtures.filter(g=>g.id!==f.id),rules.passage):null;return a?<rect key={`access-${f.id}`} x={a.x} y={a.y} width={a.w} height={a.h} fill="#6dbb9d" fillOpacity={.18} stroke="#409071" strokeWidth={15} strokeDasharray="60 35"><title>{f.kind}の使用スペース候補</title></rect>:null})}
 {p.doors.map(d=>{const v=d.position.orientation==='v';return <line key={d.id} x1={v?d.position.coord:d.position.start} y1={v?d.position.start:d.position.coord} x2={v?d.position.coord:d.position.start+d.width} y2={v?d.position.start+d.width:d.position.coord} stroke="#2a9396" strokeWidth={70}/>})}
 {result.issues.map((i,n)=><circle key={n} cx={i.x} cy={i.y} r={110} fill="#c34836"><title>{i.message}</title></circle>)}
 {[0,1,2,3].map(i=><rect key={i} x={(i%2?p.envelope.W:0)-90} y={(i>1?p.envelope.D:0)-90} width={180} height={180} fill="#28799f" style={{cursor:'ew-resize'}} onPointerDown={e=>e.currentTarget.setPointerCapture(e.pointerId)} onPointerMove={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const svg=e.currentTarget.ownerSVGElement!,point=svg.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const matrix=svg.getScreenCTM();if(!matrix)return;const q=point.matrixTransform(matrix.inverse());setWidth(Math.max(500,Math.min(30000,Math.round((i%2?q.x:p.envelope.W-q.x)/50)*50)))}} onPointerUp={e=>e.currentTarget.releasePointerCapture(e.pointerId)}/>)}
 </svg>
 <p role="status">{result.valid?'設計条件内の候補です':'この候補は確定できません'}</p>
 <ul>{result.issues.map((i,n)=><li key={n}>{i.message}</li>)}</ul>
 <details><summary>元案の問題箇所</summary><ul>{original.map((i,n)=><li key={n}>{i.message}</li>)}</ul></details>
 <p>緑の破線は使用スペース候補です（通常600 mm、テーブル750 mm）。家具の正面方向が元データにないため、空いている側を候補とします。柱中心は固定。柱断面・窓寸法・設備配管は未検証です。</p>
 <button disabled={!result.valid||!onApply} onClick={()=>setMessage(onApply?.(p)??'反映しました')}>この住戸に反映</button><p role="status">{message}</p>
 </details>
}
