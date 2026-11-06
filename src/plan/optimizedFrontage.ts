import type { FrontageGrouping, FrontageType } from './frontageBlocks'
/** 位相を固定した一次元の整数寸法探索。充填長最大、同長なら戸数最小。
 * 未確認寸法・余り吸収は使わない。法規や構造の最適解を意味しない。
 */
export function optimizedFrontage(widths: readonly number[], types: readonly FrontageType[]): FrontageGrouping {
 let total=0
 const columns=widths.map(widthMm=>{const c={startMm:total,widthMm};total+=widthMm;return c})
 if(widths.some(w=>!Number.isSafeInteger(w)||w<=0)||total>200000) throw new Error('探索する間口は整数 mm、合計 200 m 以下にしてください')
 const known=types.filter((t):t is FrontageType & {frontageMm:number}=>t.frontageMm!==null && Number.isSafeInteger(t.frontageMm)&&t.frontageMm>0)
 const count=new Float64Array(total+1).fill(Infinity)
 const choice=new Int32Array(total+1).fill(-1)
 count[0]=0
 for(let x=0;x<=total;x++) {
  if(!Number.isFinite(count[x])) continue
  known.forEach((t,k)=>{const end=x+t.frontageMm;if(end<=total && count[x]!+1<count[end]!) {count[end]=count[x]!+1;choice[end]=k}})
 }
 let end=total
 while(end>0 && choice[end]===-1) end--
 const sequence: (FrontageType & {frontageMm:number})[]=[]
 while(end>0){const t=known[choice[end]!]!;sequence.push(t);end-=t.frontageMm}
 sequence.reverse()
 const colAt=(x:number)=>Math.max(0,columns.findIndex(c=>x>=c.startMm&&x<c.startMm+c.widthMm))
 let startMm=0
 const units=sequence.map((t,group)=>{const start=startMm;startMm+=t.frontageMm;return {typeId:t.id,startMm:start,widthMm:t.frontageMm,firstColumn:colAt(start),lastColumn:colAt(startMm-1),provisional:false,absorbed:false,group}})
 return {columns,units}
}
