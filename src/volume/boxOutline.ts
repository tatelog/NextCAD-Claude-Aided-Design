import type {StrokeEntry} from '../store/drawing'
import type {Point} from '../geom/viewport'
import type {Stroke,Node,Segment} from '../model/schema'
import {strokeToSegments} from '../canvas/strokeToSegments'
export function boxOutline(width:number,depth:number,center:Point):StrokeEntry[]{
 if(!Number.isInteger(width)||!Number.isInteger(depth)||width<=0||depth<=0)throw new Error('幅と奥行きは正の整数mmで入力してください')
 const x=Math.round(center.x-width/2),y=Math.round(center.y-depth/2)
 const points=[{x,y},{x:x+width,y},{x:x+width,y:y+depth},{x,y:y+depth}]
 const entries:StrokeEntry[]=[],nodes:Node[]=[],segments:Segment[]=[]
 for(let i=0;i<4;i++){
 const a=points[i]!,b=points[(i+1)%4]!
 const stroke:Stroke={id:crypto.randomUUID(),points:[{px:a.x,py:-a.y},{px:b.x,py:-b.y}],view_scale:1,view_origin:{px:0,py:0},stage:'F4',pen_mode:'line',pen_input:'mouse',created_at:new Date().toISOString()}
 const result=strokeToSegments(stroke,nodes,{rdpTolerancePx:0,axisSnapDeg:0,snapRadiusMm:0,gridMm:null},segments)
 nodes.push(...result.nodes);segments.push(...result.segments);entries.push({stroke,...result})
 }
 return entries
}
