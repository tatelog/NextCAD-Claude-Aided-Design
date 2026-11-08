interface PlacedPlan {
 cells: readonly {id:string;y0?:number}[]
 unitTypeIdsByCell?: Record<string,string|null>
 spanTypes?: readonly (string|null)[]
 depthMm?: number
 spans?: number
}
/** 現在の階数内に実在する配置だけを集計。未作成階の暗黙の複製はしない。 */
export function summarizePlacedUnits(plans:Record<number,PlacedPlan>,types:readonly {id:string;name:string}[],selectedFloor:number,storeyCount:number){
 const floors=Object.entries(plans).filter(([floor])=>Number(floor)>=1&&Number(floor)<=storeyCount)
 const counts=new Map<string,number>()
 let total=0
 for(const [,plan] of floors){
  for(const cell of plan.cells){
   const legacyIndex=plan.depthMm&&plan.spans&&cell.y0!==undefined?Math.floor(cell.y0/(plan.depthMm/plan.spans)):-1
   const id=plan.unitTypeIdsByCell ? plan.unitTypeIdsByCell[cell.id] : plan.spanTypes?.[legacyIndex]
   const name=types.find(t=>t.id===id)?.name ?? 'タイプ未設定'
   counts.set(name,(counts.get(name)??0)+1)
   total++
  }
 }
 return {total:floors.length?total:null,selected:selectedFloor>=1&&selectedFloor<=storeyCount?plans[selectedFloor]?.cells.length??null:null,plannedFloors:floors.length,unplannedFloors:Math.max(0,storeyCount-floors.length),byType:[...counts].map(([name,count])=>({name,count})).sort((a,b)=>a.name.localeCompare(b.name,'ja',{numeric:true}))}
}
