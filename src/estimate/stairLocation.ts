import {cellInsideOutline} from '../plan/units'
import type {Point} from '../geom/viewport'
import type {Rect} from '../plan/candidateCells'
/** 階段の平面領域が外形から少しでも出れば外部。境界への接触は内部。 */
export function stairLocation(rect:Omit<Rect,'id'>,outline:readonly Point[]):'内部階段'|'外部階段'|null {
 if(outline.length<3 || rect.x1<=rect.x0 || rect.y1<=rect.y0)return null
 return cellInsideOutline({...rect,id:'stair'},outline) ? '内部階段':'外部階段'
}
