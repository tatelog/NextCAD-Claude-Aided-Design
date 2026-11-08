import type {AutoPlan} from './autoPlan'
import {placeUnitPlan} from './unitPlan39'
import {corridorForCell} from './planCorridors'
type Point={x:number;y:number}
function clip(poly:Point[],a:number,b:number,c:number){const out:Point[]=[];for(let i=0;i<poly.length;i++){const p=poly[i]!,q=poly[(i+1)%poly.length]!,u=a*p.x+b*p.y-c,v=a*q.x+b*q.y-c;if(u<=0)out.push(p);if((u<=0)!==(v<=0)){const t=u/(u-v);out.push({x:p.x+t*(q.x-p.x),y:p.y+t*(q.y-p.y)})}}return out}
export function tributaryAreas(points:Point[],outline:Point[]){return points.map(p=>{let poly=outline;for(const q of points){if(p===q)continue;poly=clip(poly,2*(q.x-p.x),2*(q.y-p.y),q.x*q.x+q.y*q.y-p.x*p.x-p.y*p.y)}return Math.abs(poly.reduce((n,a,i)=>{const b=poly[(i+1)%poly.length]!;return n+a.x*b.y-b.x*a.y},0))/2/1e6})}
export function preliminarySections(plan:AutoPlan,input:{floors:number;fc:number;ratio:number;extraDead:number;live:number;slabMm:number}):{error:string}|{side:number;area:number;axialKN:number;q:number;columnCount:number}{
 if(!Object.values(input).every(Number.isFinite)||input.floors<1||!Number.isInteger(input.floors)||input.fc<=0||input.ratio<=0||input.ratio>=1||input.extraDead<0||input.live<0||input.slabMm<=0)return {error:'算定条件を正の数で入力してください'} as const
 const unique=new Map<string,Point>()
 for(const cell of plan.cells){const placed=placeUnitPlan(plan.unitTypeIdsByCell?.[cell.id]??'',plan.unitPlanVariants?.[cell.id]??'A',cell,corridorForCell(plan,cell),plan.unitPlanOverrides?.[cell.id]);for(const c of placed.columns??[])unique.set(`${c.x.toFixed(2)},${c.y.toFixed(2)}`,c)}
 const columns=plan.buildingColumns??[...unique.values()];if(!columns.length)return {error:'柱位置がありません'} as const
 const outline=plan.buildingOutline?.length?[...plan.buildingOutline]:[{x:0,y:0},{x:plan.widthMm,y:0},{x:plan.widthMm,y:plan.depthMm},{x:0,y:plan.depthMm}]
 if(outline.length!==4||outline.some((p,i)=>{const q=outline[(i+1)%outline.length]!;return Math.abs(p.x-q.x)>1&&Math.abs(p.y-q.y)>1}))return {error:'矩形以外の外形は荷重分担モデルの確認が必要です'} as const
 if(columns.some(c=>c.x<0||c.y<0||c.x>plan.widthMm||c.y>plan.depthMm))return {error:'柱位置が外形外にあります'} as const
 // 最近接柱による負担面積の幾何的仮定。梁剛性・荷重経路は未解析。
 const areas=tributaryAreas(columns,outline),area=Math.max(...areas),q=input.slabMm/1000*24+input.extraDead+input.live
 const axialKN=area*q*input.floors,side=Math.ceil(Math.sqrt(axialKN*1000/(input.fc*input.ratio))/50)*50
 return {side,area,axialKN,q,columnCount:columns.length} as const
}
