type Point={x:number;y:number}
type Box={x0:number;x1:number;y0:number;y1:number}
/** 矩形の和集合による完全包含。サンプリング間隔より小さい隙間も検出する。 */
function covered(box:Box,areas:readonly Box[]){
 const xs=[...new Set([box.x0,box.x1,...areas.flatMap(a=>[a.x0,a.x1]).filter(x=>x>box.x0&&x<box.x1)])].sort((a,b)=>a-b)
 for(let i=1;i<xs.length;i++){
  const x=(xs[i-1]!+xs[i]!)/2
  const intervals=areas.filter(a=>a.x0<=x&&a.x1>=x).map(a=>[a.y0,a.y1] as const).sort((a,b)=>a[0]-b[0])
  let end=box.y0
  for(const [lo,hi] of intervals){if(hi<end)continue;if(lo>end+1e-6)break;end=Math.max(end,hi);if(end>=box.y1-1e-6)break}
  if(end<box.y1-1e-6)return false
 }
 return true
}
/** 設計上の通行幅。法規適合・扉の防火性能・避難距離の判定ではない。 */
export function routeCovered(route:readonly Point[],areas:readonly Box[],width:number){
 if(route.length<2||!Number.isFinite(width)||width<=0)return false
 const r=width/2
 for(let i=1;i<route.length;i++){
  const a=route[i-1]!,b=route[i]!
  if(![a.x,a.y,b.x,b.y].every(Number.isFinite))return false
  if(a.x===b.x&&a.y===b.y)continue
  if(a.x!==b.x&&a.y!==b.y)return false
  const box=a.x===b.x?{x0:a.x-r,x1:a.x+r,y0:Math.min(a.y,b.y),y1:Math.max(a.y,b.y)}:{x0:Math.min(a.x,b.x),x1:Math.max(a.x,b.x),y0:a.y-r,y1:a.y+r}
  if(!covered(box,areas))return false
  if(i<route.length-1&&!covered({x0:b.x-r,x1:b.x+r,y0:b.y-r,y1:b.y+r},areas))return false
 }
 return true
}
