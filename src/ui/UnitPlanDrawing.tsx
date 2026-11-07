import { type UnitPlan39, placeUnitPlan } from '../plan/unitPlan39'
import type { Rect } from '../plan/candidateCells'
export function UnitPlanDrawing({typeId,variant='A',cell,corridor,override}:{override?:UnitPlan39;typeId:string;variant?:string;cell:Rect;corridor:Rect}) {
 const p=placeUnitPlan(typeId,variant,cell,corridor,override)
 if(p.status!=='ok'||!p.plan)return <text x={(cell.x0+cell.x1)/2} y={(cell.y0+cell.y1)/2} textAnchor="middle" fontSize={220} fill="#a45121">{p.status}</text>
 const plan=p.plan
 const textAngle=p.transform.startsWith("matrix(0 1")?-90:p.transform.startsWith("matrix(0 -1")?90:p.transform.startsWith("matrix(-1")?180:0
 return <g transform={p.transform} pointerEvents="none" data-plan-id={plan.id}>
 {plan.rooms.map(r=><g key={r.id}><rect x={r.x} y={r.y} width={r.w} height={r.h} fill={r.kind==='居室'?'#f6f2e7':'#edf2f4'} stroke="#66717c" strokeWidth={35}/><text transform={`rotate(${textAngle} ${r.x+r.w/2} ${r.y+r.h/2})`} x={r.x+r.w/2} y={r.y+r.h/2} textAnchor="middle" fontSize={180} fill="#24354b">{r.name}</text></g>)}
 {plan.fixtures.map(f=><g key={f.id}><rect x={f.x} y={f.y} width={f.w} height={f.h} fill="white" stroke="#879399" strokeWidth={20}/><text transform={`rotate(${textAngle} ${f.x+f.w/2} ${f.y+f.h/2})`} x={f.x+f.w/2} y={f.y+f.h/2} textAnchor="middle" fontSize={Math.min(120,f.w/(f.kind.length+1))}>{f.kind}</text></g>)}
 {plan.doors.map(d=>{const v=d.position.orientation==='v',x=v?d.position.coord:d.position.start,y=v?d.position.start:d.position.coord,w=d.width;return <g key={d.id} transform={`translate(${x} ${y}) rotate(${v?90:0})`}><line x2={w} stroke="white" strokeWidth={65}/>{d.kind==='引戸'||d.kind==='折戸'?<path d={`M 0 35 H ${w} M 0 75 H ${w}`} fill="none" stroke="#48677b" strokeWidth={20}/>:<path d={`M 0 0 V ${w} M 0 ${w} A ${w} ${w} 0 0 0 ${w} 0`} fill="none" stroke="#48677b" strokeWidth={20}/>}</g>})}
 {plan.windows.map(w=>{const r=plan.rooms.find(r=>r.id===w.room_id);if(!r)return null;const h=w.side==='N'||w.side==='S';return <line key={w.id} x1={h?r.x+r.w*.25:w.side==='W'?r.x:r.x+r.w} x2={h?r.x+r.w*.75:w.side==='W'?r.x:r.x+r.w} y1={h?(w.side==='N'?r.y:r.y+r.h):r.y+r.h*.25} y2={h?(w.side==='N'?r.y:r.y+r.h):r.y+r.h*.75} stroke="#5ca9cb" strokeWidth={65}/>})}
 {plan.columns.map(c=><circle key={c.id} cx={c.x} cy={c.y} r={80} fill="#7c858b"><title>柱位置（断面寸法未収録）</title></circle>)}
 </g>
}
