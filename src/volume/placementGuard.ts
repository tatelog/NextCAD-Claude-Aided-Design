import polygonClipping from 'polygon-clipping'
import type { Point } from '../geom/viewport'
import { boundaryDistances } from './setbackLines'
/** 案件の配置制約: 敷地内かつ隣地辺から500mm以上。道路辺は敷地内のみ。 */
export function placementAllowed(lot:readonly Point[],building:readonly Point[],roadEdge:number):boolean {
 if(lot.length<3 || building.length<3)return false
 if(building.some(p=>!Number.isFinite(p.x+p.y)))return false
 const ring=(ps:readonly Point[]):[number,number][]=>ps.map(p=>[p.x,p.y])
 if(polygonClipping.difference([ring(building)],[ring(lot)]).length)return false
 return (boundaryDistances(lot,building)??[]).every((line,i)=>i===roadEdge || line.valueMm>=500-1e-6)
}
