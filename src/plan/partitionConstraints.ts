import type {UnitPlan39} from './unitPlan39'
type Box={x:number;y:number;w:number;h:number}
export const intersects=(a:Box,b:Box)=>Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)+1&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y)+1
const contains=(a:Box,b:Box)=>a.x>=b.x-1&&a.y>=b.y-1&&a.x+a.w<=b.x+b.w+1&&a.y+a.h<=b.y+b.h+1
/** 設計上の使用余白。法規値ではない。向き未収録のため利用可能な側を候補表示する。 */
export function usageCandidates(f:Box&{kind:string},clearance=600):Box[]{
 if(f.kind==='PS')return []
 const c=f.kind.includes('テーブル')?750:clearance
 const sides=[{x:f.x-c,y:f.y,w:c,h:f.h},{x:f.x+f.w,y:f.y,w:c,h:f.h},{x:f.x,y:f.y-c,w:f.w,h:c},{x:f.x,y:f.y+f.h,w:f.w,h:c}]
 return f.kind.includes('ベッド')?sides.filter((_,i)=>f.h>=f.w?i<2:i>=2):sides
}
export function availableUsage(f:Box&{kind:string},room:Box,others:Box[],clearance=600){return usageCandidates(f,clearance).find(b=>contains(b,room)&&!others.some(o=>intersects(b,o)))}
/** 同一座標の間仕切りを共通の変数として解く。水回りの幅・奥行は等式制約。 */
export function partitionAxis(source:UnitPlan39,target:number,axis:'x'|'y',anchors:number[]=[]){
 const size=axis==='x'?'w':'h',extent=axis==='x'?source.envelope.W:source.envelope.D
 // 外周は新しい外形に追従する。PS実体の固定は家具配置側で保ち、外周とPS端を同じ変数にしない。
 const coordinates=[...new Set([0,extent,...anchors,...source.rooms.flatMap(r=>[r[axis],r[axis]+r[size]])])].sort((a,b)=>a-b)
 const lengths=coordinates.slice(1).map((p,i)=>(p-coordinates[i]!)*target/extent)
 const constraints=[{from:0,to:lengths.length,value:target},...anchors.filter(v=>v>0&&v<extent).map(v=>({from:0,to:coordinates.indexOf(v),value:v})),...source.rooms.filter(r=>r.kind==='水回り'||/浴室|WC|トイレ|洗面/.test(r.name)).map(r=>({from:coordinates.indexOf(r[axis]),to:coordinates.indexOf(r[axis]+r[size]),value:r[size]}))]
 for(let pass=0;pass<1200;pass++)for(const c of constraints){const sum=lengths.slice(c.from,c.to).reduce((a,b)=>a+b,0),delta=(c.value-sum)/(c.to-c.from);for(let i=c.from;i<c.to;i++)lengths[i]=lengths[i]!+delta}
 const valid=lengths.every(n=>n>1)&&constraints.every(c=>Math.abs(lengths.slice(c.from,c.to).reduce((a,b)=>a+b,0)-c.value)<.1)
 const positions=[0];for(const n of lengths)positions.push(positions[positions.length-1]!+n)
 const map=(v:number)=>{const i=Math.max(0,Math.min(lengths.length-1,coordinates.findIndex((c,i)=>i<coordinates.length-1&&v>=c&&v<=coordinates[i+1]!)));return positions[i]!+(v-coordinates[i]!)/(coordinates[i+1]!-coordinates[i]!)*lengths[i]!}
 return {map,valid}
}
