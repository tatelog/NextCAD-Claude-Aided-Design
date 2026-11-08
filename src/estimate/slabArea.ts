import polygonClipping from 'polygon-clipping'
import type {Rect} from '../plan/candidateCells'
type Point={x:number;y:number}
/** 室内とバルコニーの和集合から吹抜けの和集合を控除。重複を数えない。 */
export function slabAreaMm2(outline:readonly Point[],balconies:readonly Rect[],voids:readonly Rect[]):number{
 const polygon=(points:readonly Point[]):polygonClipping.Polygon=>[points.map(p=>[p.x,p.y])]
 const rect=(r:Rect):polygonClipping.Polygon=>polygon([{x:r.x0,y:r.y0},{x:r.x1,y:r.y0},{x:r.x1,y:r.y1},{x:r.x0,y:r.y1}])
 const parts=[...(outline.length>=3?[polygon(outline)]:[]),...balconies.map(rect)]
 if(!parts.length)return 0
 const union=polygonClipping.union(parts[0]!,...parts.slice(1))
 const floor=voids.length?polygonClipping.difference(union,...voids.map(rect)):union
 const ringArea=(ring:polygonClipping.Ring)=>Math.abs(ring.reduce((sum,a,i)=>{const b=ring[(i+1)%ring.length]!;return sum+a[0]*b[1]-b[0]*a[1]},0))/2
 return floor.reduce((sum,poly)=>sum+ringArea(poly[0]!)-poly.slice(1).reduce((n,hole)=>n+ringArea(hole),0),0)
}
