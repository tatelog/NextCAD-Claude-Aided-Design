import {unitAreaAllowed,unitAreaRange,unitAreaReason} from './unitAreaRange'
import {livingQuality} from './layoutQuality'
import {recomposeUnit} from './recomposeUnit'
import {corridorForCell} from './planCorridors'
import type {UnitPlan39} from './unitPlan39'
import {readUnitPlan,placeUnitPlan} from './unitPlan39'
import {reshapeUnit,resizeUnit} from './reshapeUnit'
import {adaptUnitToColumns} from './buildingFrame'
import type {AutoPlan} from './autoPlan'
import {applyUnitPlans} from './applyUnitPlans'
import {cellInsideOutline} from './units'
import type {Rect} from './candidateCells'
const reshapeCache=new Map<string,ReturnType<typeof reshapeUnit>>()
const recomposeCache=new Map<string,ReturnType<typeof recomposeUnit>>()
function recomposed(source:UnitPlan39,bounds:{maxFrontage:number;maxDepth:number}){
 const key=JSON.stringify([source,bounds]);let result=recomposeCache.get(key)
 if(!result){result=recomposeUnit(source,bounds);if(recomposeCache.size>300)recomposeCache.clear();recomposeCache.set(key,result)}
 return result
}
function adjusted(source:UnitPlan39,width:number){const key=JSON.stringify([source,width]);let r=reshapeCache.get(key);if(!r){r=reshapeUnit(source,width);if(reshapeCache.size>300)reshapeCache.clear();reshapeCache.set(key,r)}return r}
export function viableUnitType(type:string){return ['A','B','C'].some(v=>{const p=readUnitPlan(type,v);return p?(unitAreaAllowed(p.type,p.envelope.W*p.envelope.D)&&adjusted(p,p.envelope.W).valid)||!!recomposed(p,{maxFrontage:30000,maxDepth:p.envelope.D}).plan:false})}
export function fitUnitAutomatically(sources:UnitPlan39[],bounds:{maxFrontage:number;maxDepth:number}):{plan?:UnitPlan39;candidates?:UnitPlan39[];reasons:string[]}{
 const reasons=new Set<string>()
 const candidates:UnitPlan39[]=[]
 for(const source of sources){
  if(!unitAreaAllowed(source.type,source.envelope.W*source.envelope.D))reasons.add(unitAreaReason(source.type))
  const range=unitAreaRange(source.type)
  const area=source.envelope.W*source.envelope.D,min=area/bounds.maxDepth,max=bounds.maxFrontage
  if(!Number.isFinite(min)||max<500){reasons.add('配置できる幅・奥行がありません');continue}
  if(min>max)reasons.add('元案と同面積の候補は利用可能な幅・奥行に収まりません')
  const widths=min<=max?[Math.max(min,Math.min(max,source.envelope.W)),min,max,...[.25,.5,.75].map(t=>min+(max-min)*t)]:[]
  for(const width of [...new Set(widths)]){
   try{const result=adjusted(source,width);if(result.valid&&unitAreaAllowed(source.type,result.plan.envelope.W*result.plan.envelope.D)){
    const original=livingQuality(source),quality=livingQuality(result.plan)
    if(quality.areaMm2+.01<original.areaMm2||quality.shortSideMm+.01<original.shortSideMm){reasons.add('LDK・DKの面積または短辺が元の住戸案より小さくなります');continue}
    candidates.push(result.plan)
   }for(const i of result.issues)reasons.add(i.message)}catch(e){reasons.add(e instanceof Error?e.message:String(e))}
  }
  // 合意したタイプ別面積の中で間仕切りを再配置。家具・水回りは実寸のまま検査する。
  if(range&&!candidates.length){
   const depth=Math.min(bounds.maxDepth,source.envelope.D)
   const lo=range.min*1e6/depth,hi=Math.min(max,range.max*1e6/depth)
   for(const width of [...new Set([Math.min(hi,Math.max(lo,source.envelope.W)),hi,(lo+hi)/2,lo])]){
    if(width<lo||hi<lo)continue
    const key=JSON.stringify(['area',source,width,depth]);let result=reshapeCache.get(key)
    if(!result){result=resizeUnit(source,width,depth);reshapeCache.set(key,result)}
    if(result.valid&&unitAreaAllowed(source.type,width*depth))candidates.push(result.plan)
    else result.issues.forEach(i=>reasons.add(i.message))
   }
   if(hi<lo)reasons.add(`${unitAreaReason(source.type)}（利用可能 ${(max*depth/1e6).toFixed(1)}㎡）`)
  }

 }
 if(!candidates.length)for(const source of sources){
  const result=recomposed(source,bounds)
  if(result.plan&&unitAreaAllowed(source.type,result.plan.envelope.W*result.plan.envelope.D))candidates.push(result.plan)
  else result.reasons.forEach(r=>reasons.add(r))
 }
 candidates.sort((a,b)=>{const x=livingQuality(a),y=livingQuality(b);return Math.abs(y.areaMm2-x.areaMm2)>.01?y.areaMm2-x.areaMm2:y.shortSideMm-x.shortSideMm})
 if(candidates.length)return {plan:candidates[0],candidates,reasons:[]}
 if(!sources.length)reasons.add('対応する住戸詳細案がありません')
 return {reasons:[...reasons]}
}
const overlaps=(a:Rect,b:Rect)=>Math.min(a.x1,b.x1)>Math.max(a.x0,b.x0)+.01&&Math.min(a.y1,b.y1)>Math.max(a.y0,b.y0)+.01
/** 各階のボリューム・コアが確定した後に呼ぶ。手動操作なしで採否を決める。 */
function fitSeedFloorUnitsAutomatically(base:AutoPlan,outline:readonly {x:number;y:number}[],cache=new Map<string,ReturnType<typeof fitUnitAutomatically>>()):AutoPlan{
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
    let w=chosen.envelope.W+(maxFrontage-chosen.envelope.W)*fraction
    const h=chosen.envelope.D+(depth-chosen.envelope.D)*fraction
    const limit=unitAreaRange(type);if(limit)w=Math.min(w,limit.max*1e6/h)
    if(w<chosen.envelope.W||!unitAreaAllowed(type,w*h))continue
    const expanded=make(w,h)
    if(w*h<=chosen.envelope.W*chosen.envelope.D+1||!cellInsideOutline(expanded,outline)||[...base.cores,...(base.bridges??[]),...(base.voids??[]),...cells].some(obstacle=>overlaps(expanded,obstacle)))continue
    const growKey=`grow:${JSON.stringify(candidate)}:${w}:${h}`
    let grown=cache.get(growKey)
    if(!grown){const r=resizeUnit(candidate,w,h);const old=livingQuality(candidate),next=livingQuality(r.plan);grown=r.valid&&next.areaMm2>=old.areaMm2-.01&&next.shortSideMm>=old.shortSideMm-.01?{plan:r.plan,reasons:[]}:{reasons:r.issues.map(i=>i.message)};cache.set(growKey,grown)}
    if(grown.plan){chosen=grown.plan;chosenCell=expanded}
   }
   if(!unitAreaAllowed(type,chosen.envelope.W*chosen.envelope.D)){failures.add(unitAreaReason(type));continue}
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


/** コアで分断された初期区画を固定せず、残る連続帯を先頭から再割付する。 */
export function fitFloorUnitsAutomatically(base:AutoPlan,outline:readonly {x:number;y:number}[],cache=new Map<string,ReturnType<typeof fitUnitAutomatically>>()):AutoPlan{
 const initial=base.frameGridY?undefined:fitSeedFloorUnitsAutomatically(base,outline,cache)
 const cells:Rect[]=[],overrides:Record<string,UnitPlan39>={},types:Record<string,string>={}
 const available=[...new Set(base.frameUnitTypeIds??Object.values(base.unitTypeIdsByCell??{}).filter((t):t is string=>!!t))]
 for(const [ci,corridor] of (base.corridors??[base.corridor]).entries())for(const left of [true,false]){
  const originals=base.cells.filter(c=>left?c.x1<=corridor.x0+1:c.x0>=corridor.x1-1)
  if(!originals.length)continue
  const x0=left?Math.min(...originals.map(c=>c.x0)):corridor.x1
  const x1=left?corridor.x0:Math.max(...originals.map(c=>c.x1))
  let intervals:[[number,number]]|Array<[number,number]>=[[corridor.y0,corridor.y1]]
  for(const obstacle of [...base.cores,...(base.bridges??[]),...(base.voids??[])]){
   if(Math.min(x1,obstacle.x1)<=Math.max(x0,obstacle.x0))continue
   intervals=intervals.flatMap(([a,b])=>obstacle.y1<=a||obstacle.y0>=b?[[a,b] as [number,number]]:([[a,Math.min(b,obstacle.y0)],[Math.max(a,obstacle.y1),b]] as Array<[number,number]>).filter(([lo,hi])=>hi>lo))
  }
  let index=0
  if(base.frameGridY){
   const grid=base.frameGridY,depthMax=x1-x0
   const sourcesOf=(type:string)=>['A','B','C'].flatMap(v=>{const p=readUnitPlan(type,v);return p?[p]:[]})
   // 区画の間口 w に収まる住戸案。水回り・家具・動線の検査は従来の通り芯区画と同じ。
   const fitAt=(type:string,w:number):UnitPlan39|undefined=>{
    const range=unitAreaRange(type),d=Math.min(depthMax,range?range.max*1e6/w:depthMax)
    if(d<Math.min(depthMax,5000)||!unitAreaAllowed(type,w*d))return undefined
    const fixedKey=`frame:${type}:${w}:${d}`;let fixed=cache.get(fixedKey)
    if(!fixed){const sources=sourcesOf(type);const fitted=fitUnitAutomatically(sources,{maxFrontage:w,maxDepth:d})
     const fitCandidates=fitted.candidates??(fitted.plan?[fitted.plan]:[])
     let resized=fitCandidates.map(p=>resizeUnit(p,w,Math.min(d,p.envelope.D))).find(r=>r.valid&&unitAreaAllowed(type,r.plan.envelope.W*r.plan.envelope.D))
     if(!resized)resized=sources.flatMap(source=>{const p=recomposed(source,{maxFrontage:w,maxDepth:d}).plan;return p?[resizeUnit(p,w,p.envelope.D)]:[]}).find(r=>r.valid&&unitAreaAllowed(type,r.plan.envelope.W*r.plan.envelope.D))
     fixed=resized?{plan:resized.plan,reasons:[]}:{reasons:['共通通り芯の区画に収まる住戸がありません']};cache.set(fixedKey,fixed)
    }
    return fixed.plan
   }
   const cellAt=(y:number,plan:UnitPlan39,id:string):Rect=>({id,x0:left?corridor.x0-plan.envelope.D:corridor.x1,x1:left?corridor.x0:corridor.x1+plan.envelope.D,y0:y,y1:y+plan.envelope.W})
   type Step={y:number;type:string;plan:UnitPlan39}
   type Choice={count:number;area:number;covered:number;steps:Step[]}
   const better=(a:Choice,b:Choice|undefined)=>!b||a.count>b.count||(a.count===b.count&&(a.area>b.area+1||(Math.abs(a.area-b.area)<=1&&a.covered>b.covered+1)))
   const placeable=(y:number,type:string,plan:UnitPlan39,end:number)=>{const c=cellAt(y,plan,'probe');return c.y1<=end+.01&&cellInsideOutline(c,outline)&&!cells.some(o=>overlaps(c,o))&&!!placeUnitPlan(type,'A',c,corridor,plan).entrance}
   // 間口の並びを区間の先頭から置く。1戸でも置けなければ不成立。
   // 通り芯から外れた区切りは、共通の柱（通り芯×廊下側の柱列）が室内の設備・開口と干渉しないことを先に確かめる。
   const columnsClear=(y:number,plan:UnitPlan39)=>{
    const y1=y+plan.envelope.W,ys=grid.map(g=>Math.max(300,Math.min(base.depthMm-300,g))).filter(g=>g+300>y-600&&g-300<y1+600)
    const local=ys.map((g,i)=>({id:`c${i}`,x:left?g-y:y1-g,y:300}))
    const key=`columns:${JSON.stringify([plan,local.map(c=>c.x)])}`;let r=cache.get(key)
    if(!r){const adapted=adaptUnitToColumns(plan,local);r=adapted.plan?{plan:adapted.plan,reasons:[]}:{reasons:adapted.issues.map(i=>i.message)};cache.set(key,r)}
    return !!r.plan
   }
   const sequence=(start:number,end:number,parts:Array<{type:string;w:number}>):Choice|undefined=>{
    const steps:Step[]=[];let y=start
    for(const {type,w} of parts){const plan=fitAt(type,w);if(!plan||!placeable(y,type,plan,end)||!columnsClear(y,plan))return undefined;steps.push({y,type,plan});y+=plan.envelope.W}
    return {count:steps.length,area:steps.reduce((n,s)=>n+s.plan.envelope.W*s.plan.envelope.D,0),covered:steps.reduce((n,s)=>n+s.plan.envelope.W,0),steps}
   }
   for(const [start,end] of intervals){
    // 従来の割付: 建物の通り芯から始め、通り芯または区間の端で区切る小さい住戸を先に置く。
    const greedySteps:Step[]=[]
    let y=grid.find(v=>v>=start-.01)??end
    for(let count=0;count<30&&end-y>=2000;count++){
     const choices:Step[]=[]
     for(const type of available)for(const stop of [...new Set([...grid,end])].filter(v=>v>y+2000&&v<=end+.01)){const plan=fitAt(type,stop-y);if(plan)choices.push({y,type,plan})}
     choices.sort((a,b)=>a.plan.envelope.W-b.plan.envelope.W)
     const chosen=choices.find(c=>placeable(y,c.type,c.plan,end))
     if(chosen){greedySteps.push(chosen);y+=chosen.plan.envelope.W;continue}
     const next=grid.find(v=>v>y+.01&&v<end);if(next===undefined)break;y=next
    }
    let best:Choice={count:greedySteps.length,area:greedySteps.reduce((n,s)=>n+s.plan.envelope.W*s.plan.envelope.D,0),covered:greedySteps.reduce((n,s)=>n+s.plan.envelope.W,0),steps:greedySteps}
    // 代表の決定 2026-11-08: 隙間に空きを残さず、住戸の行を隣の階段・EV・外形の端まで引き延ばす。
    // 区間の端から端までを等分する案と、各タイプの元案の間口を並べて残りを均等に配る案を比べる。
    const length=end-start
    // 従来の割付で空きが住戸を始められる長さ（2,000 mm）未満なら、比べ直さない。
    if(length-best.covered>=2000){
     for(const type of available)for(let n=1;n<=4;n++){const option=sequence(start,end,Array.from({length:n},()=>({type,w:length/n})));if(option&&better(option,best))best=option}
     const natural=[...new Map(available.flatMap(type=>{
      const key=`${type}:${length}:${depthMax}`;let r=cache.get(key)
      if(!r){r=fitUnitAutomatically(sourcesOf(type),{maxFrontage:length,maxDepth:depthMax});cache.set(key,r)}
      return (r.candidates??(r.plan?[r.plan]:[])).map(p=>({type,w:Math.ceil(p.envelope.W/100)*100}))
     }).map(n=>[`${n.type}:${n.w}`,n])).values()]
     const combos:Array<Array<{type:string;w:number}>>=[]
     const grow=(parts:Array<{type:string;w:number}>,from:number)=>{
      const used=parts.reduce((n,p)=>n+p.w,0)
      if(parts.length)combos.push(parts)
      if(parts.length<3)natural.forEach((n,i)=>{if(i>=from&&used+n.w<=length+.01)grow([...parts,n],i)})
     }
     grow([],0)
     for(const parts of combos){
      const rest=length-parts.reduce((n,p)=>n+p.w,0)
      const stretched=rest>.01?sequence(start,end,parts.map(p=>({...p,w:p.w+rest/parts.length}))):undefined
      const option=stretched??sequence(start,end,parts)
      if(option&&better(option,best))best=option
     }
    }
    for(const {y,type,plan} of best.steps){
     const id=`packed-${ci}-${left?'L':'R'}-${index}`
     cells.push(cellAt(y,plan,id));overrides[id]=plan;types[id]=type;index++
    }
   }
   continue
  }
  // 通り芯の無い計画は、区間の先頭から元案の間口で詰める。
  for(const [start,end] of intervals){let y=start
   for(let count=0;count<30&&end-y>=2000;count++){
    const choices:Array<{type:string;plan:UnitPlan39}>=[]
    for(const type of available){
     const key=`${type}:${end-y}:${x1-x0}`;let r=cache.get(key)
     if(!r){const sources=['A','B','C'].flatMap(v=>{const p=readUnitPlan(type,v);return p?[p]:[]});r=fitUnitAutomatically(sources,{maxFrontage:end-y,maxDepth:x1-x0});cache.set(key,r)}
     for(const p of r.candidates??(r.plan?[r.plan]:[]))if(unitAreaAllowed(type,p.envelope.W*p.envelope.D))choices.push({type,plan:p})
    }
    choices.sort((a,b)=>a.plan.envelope.W-b.plan.envelope.W)
    let added=false
    for(const {type,plan} of choices){
     const id=`packed-${ci}-${left?'L':'R'}-${index}`
     const c={id,x0:left?corridor.x0-plan.envelope.D:corridor.x1,x1:left?corridor.x0:corridor.x1+plan.envelope.D,y0:y,y1:y+plan.envelope.W}
     if(c.y1>end+.01||!cellInsideOutline(c,outline)||cells.some(o=>overlaps(c,o))||!placeUnitPlan(type,'A',c,corridor,plan).entrance)continue
     cells.push(c);overrides[id]=plan;types[id]=type;y=c.y1;index++;added=true;break
    }
    if(!added)break
   }
  }
 }
 const area=(cs:Rect[])=>cs.reduce((n,c)=>n+(c.x1-c.x0)*(c.y1-c.y0),0)
 if(initial&&area(cells)<=area(initial.cells)+.01)return initial
 return applyUnitPlans({...base,cells,unitTypeIdsByCell:types,unitPlanOverrides:overrides,automaticUnitRejections:{},buildingOutline:[...outline],unitsPerFloor:cells.length,shortfall:Math.max(0,base.shortfall+base.cells.length-cells.length)})
}
