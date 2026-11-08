import type {AutoPlan} from '../plan/autoPlan'
import {frameOfPlan} from '../plan/planFrame'
export function PlanFrameLayer({plan}:{plan:AutoPlan}){const f=frameOfPlan(plan);return <g aria-label="柱位置・通り芯（計画）" pointerEvents="none">
{f.xAxes.map((x,i)=><g key={`x${x}`}><line x1={x} x2={x} y1={-300} y2={plan.depthMm+400} stroke="#97673c" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="8 3 1 3"/><text x={x} y={-180} fontSize={180} textAnchor="middle" fill="#714c2d">X{i+1}</text></g>)}
{f.yAxes.map((y,i)=><g key={`y${y}`}><line x1={-300} x2={plan.widthMm+400} y1={y} y2={y} stroke="#97673c" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="8 3 1 3"/><text x={-180} y={y} fontSize={180} textAnchor="end" fill="#714c2d">Y{i+1}</text></g>)}
{f.columns.map((p,i)=><g key={i}><rect x={p.x-300} y={p.y-300} width={600} height={600} fill={p.conflict?"#c43b3555":"#714c2d33"} stroke={p.conflict?"#b22":"#714c2d"} strokeWidth={25}/><path d={`M ${p.x-150} ${p.y} h 300 M ${p.x} ${p.y-150} v 300`} stroke="#714c2d" strokeWidth={20}/><title>計画柱芯 {p.x.toLocaleString()}, {p.y.toLocaleString()} mm（断面未確定）</title></g>)}
</g>}

