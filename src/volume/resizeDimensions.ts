import type {Point} from '../geom/viewport'
export function outlineDimensions(points:readonly Point[]){
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y)
 return {width:Math.max(...xs)-Math.min(...xs),depth:Math.max(...ys)-Math.min(...ys)}
}
/** 表示平面のX/Y方向。外形の中心を固定して伸縮する（mm）。 */
export function resizeDimensions(points:readonly Point[],width:number,depth:number):Point[]{
 const before=outlineDimensions(points)
 if(points.length<3||![before.width,before.depth,width,depth].every(n=>Number.isFinite(n)&&n>0))throw Error('横幅・奥行には0より大きい寸法を入力してください')
 const cx=(Math.min(...points.map(p=>p.x))+Math.max(...points.map(p=>p.x)))/2
 const cy=(Math.min(...points.map(p=>p.y))+Math.max(...points.map(p=>p.y)))/2
 return points.map(p=>({x:cx+(p.x-cx)*width/before.width,y:cy+(p.y-cy)*depth/before.depth}))
}
