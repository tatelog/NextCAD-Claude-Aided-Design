import type {AutoPlan} from './autoPlan'
import type {Point} from '../geom/viewport'
import {countUnits} from './units'
export function movePlanCore(plan:AutoPlan,id:string,dx:number,dy:number,outline:Point[]):AutoPlan {
 if(!Number.isFinite(dx)||!Number.isFinite(dy))throw new Error('移動量を数値で入力してください')
 const core=plan.cores.find(c=>c.id===id)
 if(!core)throw new Error('コアがありません')
 const shifted={...core,x0:core.x0+dx,x1:core.x1+dx,y0:core.y0+dy,y1:core.y1+dy}
 const check=countUnits({outline,cells:[shifted],corridors:[],cores:[...plan.cores.filter(c=>c.id!==id),...plan.cells]})
 if(check.excluded.some(e=>(id==='evHall'&&e.reasons.includes("outside"))||e.reasons.includes("core")))throw new Error('移動先が外形の外、または住戸・別のコアと重なっています')
 return {...plan,cores:plan.cores.map(c=>c.id===id?shifted:c),shaftRects:plan.shaftRects.map(s=>s.kind!=='PS'&&s.x0>=core.x0&&s.x1<=core.x1&&s.y0>=core.y0&&s.y1<=core.y1?{...s,x0:s.x0+dx,x1:s.x1+dx,y0:s.y0+dy,y1:s.y1+dy}:s)}
}
