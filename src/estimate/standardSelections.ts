import {changePackage,packageOptions,type SpecObject,type SpecSelection} from './specPackages'
/** 初期仕様。寸法が特定される什器は一致する候補だけを採用する。 */
export function standardSelections(objects:SpecObject[],previous:Record<string,SpecSelection>,heightMm:number,openingHeightMm:number,includeProvisional=false){
 const result={...previous}
 for(const o of objects){
  if(result[o.id] || o.id.startsWith("manual/"))continue
  let id:string|undefined
  const wet=/洗面|脱衣|便所|トイレ|WC/.test(o.name??'')
  if(o.part==='床')id=wet?'PKG-016':'PKG-014'
  else if(o.part==='天井')id=wet?'PKG-020':'PKG-019'
  else if(o.part==='壁')id=wet?'PKG-011':'PKG-010'
  else if(o.part==='室内戸')id=/引戸|折戸/.test(o.name??'')?'PKG-023':'PKG-022'
  else if(o.part==='キッチン')id=o.widthMm===1800?'PKG-026':o.widthMm===2100?'PKG-027':undefined
  else if(o.part==='ユニットバス')id=undefined // 浴槽の外形はUBの内法寸法ではない
  else if(o.part==='洗面')id=o.widthMm===750?'PKG-030':undefined
  else if(o.part==='収納')id=o.widthMm===900?'PKG-032':o.widthMm===1800?'PKG-033':undefined
  else if(o.part!=='外壁')id=packageOptions(o).find(p=>p.unit===o.unit)?.id
  // 外壁は既存のタイル単価表を採用。塗装パッケージへ置換しない。
  let assumption:string|undefined,quantity:number|undefined
  if(includeProvisional&&!id&&['キッチン','ユニットバス','洗面','収納'].includes(o.part)){
   id=packageOptions(o).find(p=>p.unit===o.unit)?.id
   assumption='仮仕様：図面の寸法に対応する確定仕様なし。標準案の価格で概算（実配置寸法は変更しない）'
  }
  if(includeProvisional&&o.part==='窓'&&o.quantity===null){quantity=1.8*1.2;assumption='仮仕様・仮数量：窓1箇所を幅1,800×高さ1,200mmで概算。開口寸法は未確定'}
  if(!id)continue
  result[o.id]={...changePackage(undefined,id),...(o.part==='壁'?{heightMm,openingHeightMm}:{}),...(assumption?{assumption}:{}),...(quantity!==undefined?{quantity}:{})}
 }
 return result
}
