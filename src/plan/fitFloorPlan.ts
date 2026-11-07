import type { AutoPlan } from './autoPlan'
import type { Point } from '../geom/viewport'
import { countUnits } from './units'
export function fitFloorPlan(base: AutoPlan, outline: readonly Point[]): AutoPlan {
 const excluded = outline.length < 3 ? new Set(base.cells.map(c=>c.id)) : new Set(countUnits({outline:[...outline],cells:base.cells,corridors:[base.corridor],cores:base.cores}).excluded.map(c=>c.id))
 const cells=base.cells.filter(c=>!excluded.has(c.id))
 const rooms=base.rooms.filter(r=>cells.some(c=>r.id.startsWith(c.id+'-')))
 const shaftRects=base.shaftRects.filter(s=>!s.unitId || cells.some(c=>c.id===s.unitId))
 return {...base,buildingOutline:outline.map(p=>({...p})),cells,rooms,shaftRects,unitsPerFloor:cells.length,shortfall:base.shortfall+base.cells.length-cells.length,shafts:{ps:shaftRects.filter(s=>s.kind==='PS').length,eps:shaftRects.filter(s=>s.kind==='EPS').length,ds:shaftRects.filter(s=>s.kind==='DS').length}}
}
