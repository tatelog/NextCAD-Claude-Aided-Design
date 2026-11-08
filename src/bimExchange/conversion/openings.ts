import clipping from 'polygon-clipping'
import type { Polygon, MultiPolygon } from 'polygon-clipping'
import type { ExtrudedPolygon, Point } from './types'
export function polygon(g:ExtrudedPolygon):Polygon { return [g.outer,...g.holes].map(r=>r.map(p=>[p.x,p.y])) }
export function polygonArea(polys:MultiPolygon):number {return polys.reduce((sum,p)=>sum+p.reduce((a,r,i)=>{let s=0;for(let j=0;j<r.length-1;j++)s+=r[j]![0]*r[j+1]![1]-r[j+1]![0]*r[j]![1];return a+(i===0?1:-1)*Math.abs(s/2)},0),0)}
export function overlaps(a:ExtrudedPolygon,b:ExtrudedPolygon):boolean {return Math.min(a.zMm+a.heightMm,b.zMm+b.heightMm)>Math.max(a.zMm,b.zMm)&&polygonArea(clipping.intersection(polygon(a),polygon(b)))>1e-7}
export function cutBands(wall:ExtrudedPolygon, openings:ExtrudedPolygon[]):ExtrudedPolygon[] {
 if(!openings.length)return [wall]
 const lo=wall.zMm,hi=lo+wall.heightMm,levels=[...new Set([lo,hi,...openings.flatMap(o=>[Math.max(lo,o.zMm),Math.min(hi,o.zMm+o.heightMm)])])].sort((a,b)=>a-b),result:ExtrudedPolygon[]=[]
 for(let i=0;i<levels.length-1;i++){const z=levels[i]!,top=levels[i+1]!,active=openings.filter(o=>o.zMm<top&&o.zMm+o.heightMm>z),polys=active.length?clipping.difference(polygon(wall),...active.map(polygon)):[polygon(wall)]
  for(const p of polys){const rings=p.map(r=>{const out:Point[]=r.map(([x,y])=>({x,y}));if(out.length>1&&out[0]!.x===out.at(-1)!.x&&out[0]!.y===out.at(-1)!.y)out.pop();return out});result.push({type:'extrudedPolygon',outer:rings[0]!,holes:rings.slice(1),zMm:z,heightMm:top-z})}
 }
 return result
}
