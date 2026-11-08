import catalog from './specPackageCatalog.json'
import type {Category} from './estimate'

export const PACKAGE_VERSION = catalog.version
export const PACKAGES = catalog.packages
export interface SpecObject {
  id:string; part:string; quantity:number|null; unit:string
  name?:string; category?:Category; basis?:string; legacyLineId?:string
  lengthMm?:number; openingWidthMm?:number; floor?:number
  widthMm?:number; depthMm?:number
  fixtureId?:string
}
export interface SpecSelection {
  packageId:string; version:string
  quantity?:number; heightMm?:number; openingHeightMm?:number
  price?: {value:number; status:'公表値'|'仮値'; source:string; url:string; date:string; region:string; scope:string}
}
export function changePackage(previous:SpecSelection|undefined,packageId:string):SpecSelection {
 const {quantity,heightMm,openingHeightMm}=previous??{}
 return {packageId,version:PACKAGE_VERSION,...(quantity!==undefined?{quantity}:{}),...(heightMm!==undefined?{heightMm}:{}),...(openingHeightMm!==undefined?{openingHeightMm}:{})}
}
const parts:Record<string,number[]>={
  キッチン:[26,27], ユニットバス:[28,29], 洗面:[30], 便器:[31], 収納:[32,33],
  床:[14,15,16,17], 天井:[19,20], 壁:[10,11,12], ふかし壁:[13], 巾木:[18],
  室内戸:[22,23], 玄関戸:[24], 窓:[25], 点検口:[21],
  掘削:[1], 残土:[2], 埋戻し:[3], 地業:[4,5], 基礎:[6,59],
  コンクリート:[7], 鉄筋:[8], 型枠:[9],
  給水:[34], 給湯:[35], 排水:[36], 換気:[37], 給湯器:[38], 空調:[39], 空調配管:[40],
  照明:[41], コンセント:[42], スイッチ:[43], 電気配線:[44], 分電盤:[45],
  外壁:[46], 屋根:[47], バルコニー:[48], 廊下:[49], 手すり:[50],
  屋内階段:[51], 屋外階段:[52], 舗装:[53,54], 縁石:[55], フェンス:[56], 植栽:[57], 外灯:[58],
  別構造:[60], 共用設備:[61],
}
export function packageOptions(object:SpecObject) {
  return PACKAGES.filter(p=>(parts[object.part]??[]).some(n=>p.id===`PKG-${String(n).padStart(3,'0')}`))
}
export function specQuantity(object:SpecObject, selection:SpecSelection):number|null {
  if(selection.quantity!==undefined) return selection.quantity
  if(object.lengthMm!==undefined && object.unit==='m2') {
    if(!selection.heightMm || ((object.openingWidthMm??0)>0 && !selection.openingHeightMm))return null
    return (object.lengthMm*selection.heightMm-(object.openingWidthMm??0)*(selection.openingHeightMm??0))/1e6
  }
  return object.quantity
}
export function packageLine(object:SpecObject, packageId:string, selection:SpecSelection={packageId,version:PACKAGE_VERSION}) {
  const p=packageOptions(object).find(p=>p.id===packageId)
  if(!p || selection.version!==PACKAGE_VERSION)throw new Error('対象部材に対応しない仕様、または異なる仕様版です')
  const quantity=specQuantity(object,selection)
  if(quantity!==null && (!Number.isFinite(quantity)||quantity<0))throw new Error('数量は0以上の有限値で入力してください')
  if(p.unit!==object.unit)throw new Error('部材と仕様の数量単位が一致しません')
  const price=selection.price
  if(price && (!Number.isFinite(price.value)||price.value<0||!price.source.trim()||!price.scope.trim()))throw new Error('単価の金額・出典・施工範囲を入力してください')
  if(price?.status==='公表値' && (!/^https:\/\//.test(price.url)||!price.date||!price.region))throw new Error('公表値は出典URL・適用日・地域が必要です')
  const unitPrice=price?.value??p.provisional_price
  return {objectId:object.id,packageId:p.id,version:selection.version,name:p.name,spec:p.spec,category:object.category??'内装' as Category,
    quantity,unit:p.unit,unitPrice,amount:quantity===null||unitPrice===null?null:Math.round(quantity*unitPrice),
    priceStatus:price?.status??p.price_status,source:price?.source??catalog.sources.S04.title,
    sourceUrl:price?.url??'',priceScope:price?.scope??p.spec,date:price?.date??'未設定',region:price?.region??'地域未調整',
    basis:selection.quantity!==undefined?'利用者の数量入力':object.lengthMm!==undefined?`長さ${object.lengthMm}mm × 高さ${selection.heightMm??'未入力'}mm − 開口幅${object.openingWidthMm??0}mm × 高さ${selection.openingHeightMm??'未入力'}mm`:object.basis??'平面部材の数量',
    specSourceUrl:(p.spec_source_ids as string[]).includes('M01')?catalog.sources.M01.url:null}
}
export type PackageLine=ReturnType<typeof packageLine>
export function packageTotal(lines:PackageLine[]) {return {amount:lines.reduce((s,l)=>s+(l.amount??0),0),incomplete:lines.some(l=>l.amount===null)}}
export function selectedPackageLines(objects:SpecObject[], selections:Record<string,SpecSelection>) {
  return objects.flatMap(o=>{const s=selections[o.id];if(!s)return [];try{return [packageLine(o,s.packageId,s)]}catch{return []}})
}
