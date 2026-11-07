import type { FrontageGrouping, FrontageType } from './frontageBlocks'
/** 横の住戸構成順を優先。端部の残りを別タイプで埋めない。 */
export function orderedFrontage(widths: readonly number[], types: readonly FrontageType[]): FrontageGrouping {
 let total=0
 const columns=widths.map(widthMm=>{const c={startMm:total,widthMm};total+=widthMm;return c})
 const units: FrontageGrouping['units']=[]
 if(!types.length || !columns.length) return {columns,units}
 const columnAt=(x:number)=>Math.max(0,columns.findIndex(c=>x>=c.startMm && x<c.startMm+c.widthMm))
 let startMm=0, i=0
 while(startMm<total) {
  const t=types[i%types.length]!
  const widthMm=t.frontageMm && t.frontageMm>0?t.frontageMm:columns[columnAt(startMm)]!.widthMm
  if(startMm+widthMm>total) break
  units.push({typeId:t.id,startMm,widthMm,firstColumn:columnAt(startMm),lastColumn:columnAt(startMm+widthMm-1),provisional:!t.frontageMm,absorbed:false,group:i})
  startMm+=widthMm;i++
 }
 return {columns,units}
}
