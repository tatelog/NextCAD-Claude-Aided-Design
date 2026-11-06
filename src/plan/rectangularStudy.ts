import type { AutoPlan, AutoCore, ShaftRect } from './autoPlan'
import type { Rect } from './candidateCells'
import { buildEvLevels } from './evLevels'
export interface StudyType {id:string;frontageMm:number;depthMm:number;psMm:number;wetEnd:'start'|'end'}
export interface StudyInput {widthMm:number;lengthMm:number;corridorMm:number;storeys:number;storeyHeightMm:number;columnMm:number;types:StudyType[]}
export interface StudyColumn {id:string;x:number;y:number;tributaryM2:number}
/** 長方形比較案。寸法は設計入力。法規・耐震・設備容量の適合判定は行わない。 */
export function rectangularStudy(i:StudyInput):{plan:AutoPlan;unitTypes:Record<string,string>;columns:StudyColumn[];notices:string[]} {
 const positive=(n:number)=>Number.isFinite(n)&&n>0
 if(![i.widthMm,i.lengthMm,i.corridorMm,i.storeys,i.storeyHeightMm,i.columnMm].every(positive)||!Number.isInteger(i.storeys)||!i.types.length)throw new Error('寸法と階数を正の値で入力してください')
 for(const t of i.types)if(![t.frontageMm,t.depthMm,t.psMm].every(positive)||t.psMm>=Math.min(t.frontageMm,t.depthMm))throw new Error('住戸・PS寸法を確認してください')
 const W=i.widthMm,L=i.lengthMm,c0=(W-i.corridorMm)/2,c1=c0+i.corridorMm
 if(i.types.some(t=>t.depthMm>c0))throw new Error('住戸の奥行が廊下両側の幅に収まりません')
 if(L<18000||c0<3000)throw new Error('階段・EV用の領域が不足します')
 const corridor:Rect={id:'corridor',x0:c0,x1:c1,y0:0,y1:L}
 const cores:AutoCore[]=[{id:'stairA',x0:c0-3000,x1:c0,y0:0,y1:5000},{id:'stairB',x0:c0-3000,x1:c0,y0:L-5000,y1:L},{id:'evHall',x0:c1,x1:c1+3000,y0:0,y1:6000,evCount:1}]
 const cells:Rect[]=[],unitTypes:Record<string,string>={},shaftRects:ShaftRect[]=[]
 const ys=new Set([0,L,5000,6000,L-5000]);const spanTypes:string[]=[]
 for(const side of ['L','R']){
  let y=side==='L'?5000:6000,k=0;const end=side==='L'?L-5000:L
  while(y<end){const t=i.types[k%i.types.length]!;if(y+t.frontageMm>end)break
   const id=`${side}${k}`,cell={id,x0:side==='L'?c0-t.depthMm:c1,x1:side==='L'?c0:c1+t.depthMm,y0:y,y1:y+t.frontageMm}
   cells.push(cell);unitTypes[id]=t.id;spanTypes.push(t.id);ys.add(y);ys.add(cell.y1)
   const x0=side==='L'?c0-t.psMm:c1,y0=t.wetEnd==='start'?y:cell.y1-t.psMm
   shaftRects.push({id:`PS-${id}`,kind:'PS',unitId:id,x0,x1:x0+t.psMm,y0,y1:y0+t.psMm})
   y=cell.y1;k++
  }
 }
 // EV領域内に共用設備スペースを予約。かご・機器の詳細は未割付。
 shaftRects.push({id:'EPS',kind:'EPS',x0:c1,y0:0,x1:c1+600,y1:600},{id:'DS',kind:'DS',x0:c1+600,y0:0,x1:c1+1200,y1:600})
 const xs=[0,c0,c1,W],rows=[...ys].sort((a,b)=>a-b)
 const tributary=(values:number[],k:number)=>((values[k+1]??values[k]!)-(values[k-1]??values[k]!))/2
 const columns:StudyColumn[]=xs.flatMap((x,a)=>rows.map((y,b)=>({id:`C${a}-${b}`,x,y,tributaryM2:tributary(xs,a)*tributary(rows,b)/1e6})))
 const plan:AutoPlan={unitTypeIdsByCell:unitTypes,buildingOutline:[{x:0,y:0},{x:W,y:0},{x:W,y:L},{x:0,y:L}],widthMm:W,depthMm:L,spans:rows.length-1,unitsPerFloor:cells.length,shortfall:0,unitType:'ファミリー',layout:'中廊下',stairFinish:null,shafts:{ps:cells.length,eps:1,ds:1},corridor,cells,rooms:[],cores,shaftRects,spanTypes,unsupportedSpans:[],provisionalSpans:spanTypes.map((_,k)=>k),absorbedSpans:[],ev:buildEvLevels({evCount:1,storeyCount:i.storeys,storeyHeightMm:i.storeyHeightMm,evStops:Array.from({length:i.storeys},(_,k)=>k+1)})}
 return {plan,unitTypes,columns,notices:['階段3×5m・EV/共用設備領域3×6mは仮置き。避難・設備容量・かご寸法は未検討。','柱は通り芯交点の候補。住戸への出張り、梁、耐震壁、基礎は未検討。','PSは住戸タイプの水回り側指定に連動。配管の勾配・経路・防火区画は未検討。']}
}

