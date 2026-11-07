import {livingQuality} from './layoutQuality'
import {corridorForCell} from './planCorridors'
import type {UnitPlan39} from './unitPlan39'
import {readUnitPlan,placeUnitPlan} from './unitPlan39'
import {reshapeUnit,resizeUnit} from './reshapeUnit'
import type {AutoPlan} from './autoPlan'
import {applyUnitPlans} from './applyUnitPlans'
import {cellInsideOutline} from './units'
import type {Rect} from './candidateCells'
const reshapeCache=new Map<string,ReturnType<typeof reshapeUnit>>()
function adjusted(source:UnitPlan39,width:number){const key=JSON.stringify([source,width]);let r=reshapeCache.get(key);if(!r){r=reshapeUnit(source,width);if(reshapeCache.size>300)reshapeCache.clear();reshapeCache.set(key,r)}return r}
export function viableUnitType(type:string){return ['A','B','C'].some(v=>{const p=readUnitPlan(type,v);return p?adjusted(p,p.envelope.W).valid:false})}
export function fitUnitAutomatically(sources:UnitPlan39[],bounds:{maxFrontage:number;maxDepth:number}):{plan?:UnitPlan39;candidates?:UnitPlan39[];reasons:string[]}{
 const reasons=new Set<string>()
 const candidates:UnitPlan39[]=[]
 for(const source of sources){
  const area=source.envelope.W*source.envelope.D,min=area/bounds.maxDepth,max=bounds.maxFrontage
  if(!Number.isFinite(min)||min>max||max<500){reasons.add('住戸面積を維持して配置できる幅・奥行がありません');continue}
  const widths=[Math.max(min,Math.min(max,source.envelope.W)),min,max,...[.25,.5,.75].map(t=>min+(max-min)*t)]
  for(const width of [...new Set(widths)]){
   try{const result=adjusted(source,width);if(result.valid){
    const original=livingQuality(source),quality=livingQuality(result.plan)
    if(quality.areaMm2+.01<original.areaMm2||quality.shortSideMm+.01<original.shortSideMm){reasons.add('LDK・DKの面積または短辺が元の住戸案より小さくなります');continue}
    candidates.push(result.plan)
   }for(const i of result.issues)reasons.add(i.message)}catch(e){reasons.add(e instanceof Error?e.message:String(e))}
  }
 }
 candidates.sort((a,b)=>{const x=livingQuality(a),y=livingQuality(b);return Math.abs(y.areaMm2-x.areaMm2)>.01?y.areaMm2-x.areaMm2:y.shortSideMm-x.shortSideMm})
 if(candidates.length)return {plan:candidates[0],candidates,reasons:[]}
 if(!sources.length)reasons.add('対応する住戸詳細案がありません')
 return {reasons:[...reasons]}
}
const overlaps=(a:Rect,b:Rect)=>Math.min(a.x1,b.x1)>Math.max(a.x0,b.x0)+.01&&Math.min(a.y1,b.y1)>Math.max(a.y0,b.y0)+.01
/** 各階のボリューム・コアが確定した後に呼ぶ。手動操作なしで採否を決める。 */
export function fitFloorUnitsAutomatically(base:AutoPlan,outline:readonly {x:number;y:number}[],cache=new Map<string,ReturnType<typeof fitUnitAutomatically>>()):AutoPlan{
 const cells:Rect[]=[],overrides:Record<string,UnitPlan39>={},rejected:Record<string,string[]>={}
 for(const original of [...base.cells].sort((a,b)=>a.y0-b.y0||a.x0-b.x0)){
  const corridor=corridorForCell(base,original)
  const type=base.unitTypeIdsByCell?.[original.id]
  if(!type){rejected[original.id]=['住戸タイプが未指定です'];continue}
  const left=original.x1<=corridor.x0+1,right=original.x0>=corridor.x1-1
  if(!left&&!right){rejected[original.id]=['この廊下方向は自動変形の対象外です'];continue}
  // 廊下側の開始位置を維持し、次の区画／コアまでを探索範囲とする。
  const obstacles=[...base.cores,...(base.bridges??[]),...(base.voids??[])]
  const end=Math.min(base.depthMm,...base.cells.filter(c=>c.id!==original.id&&c.y0>original.y0+.1&&(left?c.x1<=corridor.x0+1:c.x0>=corridor.x1-1)).map(c=>c.y0),...obstacles.filter(c=>c.y0>=original.y0&&Math.min(c.x1,original.x1)>Math.max(c.x0,original.x0)).map(c=>c.y0))
  const make=(frontage:number,depth:number):Rect=>({...original,x0:left?corridor.x0-depth:corridor.x1,x1:left?corridor.x0:corridor.x1+depth,y1:original.y0+frontage})
  const maxDepth=left?corridor.x0:base.widthMm-corridor.x1,maxFrontage=end-original.y0
  let sources:UnitPlan39[]=[]
  try{sources=['A','B','C'].flatMap(v=>{const p=readUnitPlan(type,v);return p?[p]:[]})}catch{rejected[original.id]=['住戸詳細を読めません'];continue}
  const failures=new Set<string>();let best:{plan:UnitPlan39;cell:Rect;area:number;living:number;short:number}|undefined
  // 凹形外形にも収まる奥行を調べる。採用時は多角形全体との包含を再確認。
  for(const ratio of [1,.9,.8,.7,.6]){
   const depth=maxDepth*ratio,key=`${type}:${maxFrontage}:${depth}`
   let result=cache.get(key);if(!result){result=fitUnitAutomatically(sources,{maxFrontage,maxDepth:depth});cache.set(key,result)}
   result.reasons.forEach(r=>failures.add(r))
   if(!result.plan)continue
   // 室内の評価が最上位でも外形に入らない場合は、他の成立形状も試す。
   for(const candidate of result.candidates??[result.plan]){
   const c=make(candidate.envelope.W,candidate.envelope.D)
   if(!cellInsideOutline(c,outline)||[...base.cores,...(base.bridges??[]),...(base.voids??[])].some(core=>overlaps(c,core))||cells.some(other=>overlaps(c,other))){failures.add('建物外形・コア・隣戸の範囲に収まりません');continue}
   let chosen=candidate,chosenCell=c
   // 既に配置可能な住戸を基に、次の住戸・外周までの余白を広げる。
   // 不成立の最大寸法を強制せず、中間候補も含めて最大の成立面積を採用。
   for(const fraction of [1,.5]){
    const w=chosen.envelope.W+(maxFrontage-chosen.envelope.W)*fraction
    const h=chosen.envelope.D+(depth-chosen.envelope.D)*fraction
    const expanded=make(w,h)
    if(w*h<=chosen.envelope.W*chosen.envelope.D+1||!cellInsideOutline(expanded,outline)||[...base.cores,...(base.bridges??[]),...(base.voids??[]),...cells].some(obstacle=>overlaps(expanded,obstacle)))continue
    const growKey=`grow:${JSON.stringify(candidate)}:${w}:${h}`
    let grown=cache.get(growKey)
    if(!grown){const r=resizeUnit(candidate,w,h);const old=livingQuality(candidate),next=livingQuality(r.plan);grown=r.valid&&next.areaMm2>=old.areaMm2-.01&&next.shortSideMm>=old.shortSideMm-.01?{plan:r.plan,reasons:[]}:{reasons:r.issues.map(i=>i.message)};cache.set(growKey,grown)}
    if(grown.plan){chosen=grown.plan;chosenCell=expanded}
   }
   if(!placeUnitPlan(type,'A',chosenCell,corridor,chosen).entrance){failures.add('玄関開口と共用廊下の接続を確認できません');continue}
   const area=chosen.envelope.W*chosen.envelope.D,quality=livingQuality(chosen)
   if(!best||area>best.area+1||(Math.abs(area-best.area)<=1&&(quality.areaMm2>best.living+.01||(Math.abs(quality.areaMm2-best.living)<=.01&&quality.shortSideMm>best.short))))best={plan:chosen,cell:chosenCell,area,living:quality.areaMm2,short:quality.shortSideMm}
   }
   // 探索区画全体まで使えたら、以降の浅い候補では面積を増やせない。
   if(best&&best.area>=maxFrontage*maxDepth-1)break
  }
  if(best){cells.push(best.cell);overrides[original.id]=best.plan}
  else rejected[original.id]=[...failures]
 }
 return applyUnitPlans({...base,cells,unitPlanOverrides:overrides,automaticUnitRejections:rejected,buildingOutline:[...outline],unitsPerFloor:cells.length,shortfall:base.shortfall+base.cells.length-cells.length})
}
