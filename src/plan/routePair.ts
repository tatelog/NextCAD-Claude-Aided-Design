type Point={x:number;y:number}
const segments=(p:readonly Point[])=>p.slice(1).map((b,i)=>({a:p[i]!,b})).filter(s=>s.a.x!==s.b.x||s.a.y!==s.b.y)
/** 玄関外から階段入口までの中心線距離。法規の歩行距離ではない。 */
export function routePairMetrics(first:readonly Point[],second:readonly Point[]){
 const a=segments(first),b=segments(second),shared=new Map<string,[number,number][]>()
 for(const s of a)for(const t of b){
  const vertical=s.a.x===s.b.x
  if(vertical!==(t.a.x===t.b.x)||(vertical?s.a.x!==t.a.x:s.a.y!==t.a.y))continue
  const axis=vertical?'y':'x',lo=Math.max(Math.min(s.a[axis],s.b[axis]),Math.min(t.a[axis],t.b[axis])),hi=Math.min(Math.max(s.a[axis],s.b[axis]),Math.max(t.a[axis],t.b[axis]))
  if(hi<=lo)continue
  const key=`${axis}:${vertical?s.a.x:s.a.y}`;shared.set(key,[...(shared.get(key)??[]),[lo,hi]])
 }
 let sharedMm=0
 for(const list of shared.values()){list.sort((a,b)=>a[0]-b[0]);let end=-Infinity;for(const [lo,hi] of list){sharedMm+=Math.max(0,hi-Math.max(lo,end));end=Math.max(end,hi)}}
 const length=(s:ReturnType<typeof segments>)=>s.reduce((n,{a,b})=>n+Math.hypot(a.x-b.x,a.y-b.y),0)
 const x=first.at(-1),y=second.at(-1)
 return {firstMm:length(a),secondMm:length(b),sharedMm,distinctDestinations:!!x&&!!y&&Math.hypot(x.x-y.x,x.y-y.y)>1}
}
