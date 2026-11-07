import type {Rect} from './candidateCells'
/** コアを除き、廊下方向に連続する最大の余白を住戸候補として残す。 */
export function remainingCoreSpace(cell:Rect,cores:readonly Rect[]):Rect|null{
 let intervals=[{start:cell.y0,end:cell.y1}]
 for(const core of cores){
  if(Math.min(cell.x1,core.x1)<=Math.max(cell.x0,core.x0))continue
  intervals=intervals.flatMap(({start,end})=>{
   if(core.y1<=start||core.y0>=end)return [{start,end}]
   return [{start,end:Math.min(end,core.y0)},{start:Math.max(start,core.y1),end}].filter(r=>r.end>r.start)
  })
 }
 intervals.sort((a,b)=>(b.end-b.start)-(a.end-a.start)||a.start-b.start)
 const best=intervals[0]
 return best?{...cell,y0:best.start,y1:best.end}:null
}
