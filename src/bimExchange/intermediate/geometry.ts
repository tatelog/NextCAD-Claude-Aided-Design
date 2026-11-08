import polygonClipping from 'polygon-clipping'
import type { Point } from './schema'

export const signedArea = (ring: Point[]) => ring.reduce((sum,p,i) => { const q=ring[(i+1)%ring.length]!; return sum+p.x*q.y-q.x*p.y },0)/2
export function normalizeRing(ring: Point[], ccw: boolean): Point[] {
  const result = ring.map(p=>({...p}))
  if(result.length>1 && result[0]!.x===result.at(-1)!.x && result[0]!.y===result.at(-1)!.y) result.pop()
  if ((signedArea(result)>0)!==ccw) result.reverse()
  return result
}
const cross = (a:Point,b:Point,c:Point) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
function on(a:Point,b:Point,p:Point) { return Math.abs(cross(a,b,p))<1e-8 && p.x>=Math.min(a.x,b.x) && p.x<=Math.max(a.x,b.x) && p.y>=Math.min(a.y,b.y) && p.y<=Math.max(a.y,b.y) }
function intersects(a:Point,b:Point,c:Point,d:Point) { return (cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b) }
function simple(ring:Point[]) {
  if(ring.length<3 || Math.abs(signedArea(ring))<1e-8) return false
  for(let i=0;i<ring.length;i++) {
    const a=ring[i]!,b=ring[(i+1)%ring.length]!
    if(a.x===b.x && a.y===b.y) return false
    for(let j=i+1;j<ring.length;j++) if(j!==i+1 && !(i===0&&j===ring.length-1) && intersects(a,b,ring[j]!,ring[(j+1)%ring.length]!)) return false
  }
  return true
}
export const polygon = (ring:Point[]): polygonClipping.Polygon => [ring.map(p=>[p.x,p.y])]
/** 穴の外周接触、穴同士の接触も曖昧なソリッドとして拒否する。 */
export function validFootprint(outer:Point[],holes:Point[][]): boolean {
  if(![outer,...holes].every(simple)) return false
  for(let i=0;i<holes.length;i++) {
    const h=holes[i]!
    if(polygonClipping.difference(polygon(h),polygon(outer)).length) return false
    for(const other of [outer,...holes.slice(0,i)]) {
      for(let a=0;a<h.length;a++) for(let b=0;b<other.length;b++) if(intersects(h[a]!,h[(a+1)%h.length]!,other[b]!,other[(b+1)%other.length]!)) return false
    }
    for(const other of holes.slice(0,i)) if(polygonClipping.intersection(polygon(h),polygon(other)).length) return false
  }
  return true
}
