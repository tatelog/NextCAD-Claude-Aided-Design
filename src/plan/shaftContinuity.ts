import type {ShaftRect} from './autoPlan'
/** 横引きを仮定しない縦シャフトの検査。最上端から1階まで同じ系統を連続させる。 */
export function shaftContinuityIssues(plans:Record<number,{shaftRects:ShaftRect[]}>):string[]{
 const issues:string[]=[],floors=Object.keys(plans).map(Number).sort((a,b)=>a-b)
 const ids=new Set(floors.flatMap(f=>plans[f]!.shaftRects.map(s=>s.id)))
 for(const id of ids){
  const occupied=floors.filter(f=>plans[f]!.shaftRects.some(s=>s.id===id)),top=Math.max(...occupied)
  const reference=plans[occupied[0]!]!.shaftRects.find(s=>s.id===id)!
  for(let floor=1;floor<=top;floor++){
   const shaft=plans[floor]?.shaftRects.find(s=>s.id===id)
   if(!shaft){issues.push(`${id}: ${floor}階に縦シャフトの連続経路がありません`);continue}
   if(shaft.kind!==reference.kind||(['x0','x1','y0','y1'] as const).some(k=>Math.abs(shaft[k]-reference[k])>1))issues.push(`${id}: ${floor}階で縦シャフトの位置・寸法がずれています`)
  }
 }
 return issues
}
