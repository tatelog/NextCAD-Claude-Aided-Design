import {PACKAGES,PACKAGE_VERSION,packageLine,type SpecObject,type SpecSelection} from './specPackages'
import catalog from './specPackageCatalog.json'
import {SpecSelectionSchema} from '../store/specSelections'
import {parsePriceCsv,serializePriceCsv} from './priceCsv'
import {PriceRowSchema,type PriceRow} from './estimate'
export type MaterialPrices=Record<string,NonNullable<SpecSelection['price']>>
const encode=(rows:unknown[][])=>rows.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n')
function records(text:string,required:string[]){
 const rows:string[][]=[];let row:string[]=[],value='',quoted=false,closed=false
 text=text.replace(/^\uFEFF/,'')
 for(let i=0;i<text.length;i++){const c=text[i]!;if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++}else{quoted=false;closed=true}}else value+=c}else if(c==='"'){if(value||closed)throw Error('CSVの引用符が不正です');quoted=true}else if(c===','||c==='\n'||c==='\r'){row.push(value);value='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(Boolean))rows.push(row);row=[]}}else{if(closed)throw Error('CSVの引用符の後に文字があります');value+=c}}
 if(quoted)throw Error('CSVの引用符が閉じていません');if(value||row.length){row.push(value);rows.push(row)}
 const header=rows.shift()??[];if(new Set(header).size!==header.length||required.some(h=>!header.includes(h)))throw Error('CSVの列が不足または重複しています')
 return rows.map((r,i)=>{if(r.length!==header.length)throw Error(`${i+2}行目の列数が違います`);return Object.fromEntries(header.map((h,j)=>[h,r[j]!] ))})
}
const number=(v:string)=>{if(!v.trim())return undefined;const n=Number(v);if(!Number.isFinite(n)||n<0)throw Error('数値は0以上で入力してください');return n}
const priceFields=['unit_price','price_status','source','url','date','region','scope']
const objectHeaders=['object_id','name','part','package_id','version','quantity','height_mm','opening_height_mm','assumption',...priceFields]
const priceValues=(p:SpecSelection['price'])=>[p?.value,p?.status,p?.source,p?.url,p?.date,p?.region,p?.scope]
const readPrice=(r:Record<string,string>)=>{const value=number(r.unit_price!);if(value===undefined)return undefined;const price=SpecSelectionSchema.shape.price.unwrap().parse({value,status:r.price_status,source:r.source,url:r.url,date:r.date,region:r.region,scope:r.scope});if(price.status==='公表値'&&(!/^https:\/\//.test(price.url)||!price.date||!price.region))throw Error('公表単価にはHTTPSの出典URL・適用日・地域が必要です');return price}
export function exportObjectSpecs(objects:SpecObject[],selections:Record<string,SpecSelection>){return encode([objectHeaders,...objects.map(o=>{const s=selections[o.id];return [o.id,o.name,o.part,s?.packageId,s?.version,s?.quantity,s?.heightMm,s?.openingHeightMm,s?.assumption,...priceValues(s?.price)]})])}
export function importObjectSpecs(csv:string,objects:SpecObject[],previous:Record<string,SpecSelection>){
 const next={...previous},byId=new Map(objects.map(o=>[o.id,o])),seen=new Set<string>()
 for(const r of records(csv,objectHeaders)){const id=r.object_id!,o=byId.get(id);if(!o||seen.has(id))throw Error(`不明または重複するオブジェクトID：${id}`);seen.add(id);if(!r.package_id){delete next[id];continue}
 const raw={packageId:r.package_id,version:r.version,quantity:number(r.quantity!),heightMm:number(r.height_mm!),openingHeightMm:number(r.opening_height_mm!),assumption:r.assumption||undefined,price:readPrice(r)}
 const s=SpecSelectionSchema.parse(Object.fromEntries(Object.entries(raw).filter(([,v])=>v!==undefined)));packageLine(o,s.packageId,s);next[id]=s
 }return next
}
const materialHeaders=['record_type','id','kind','category','item','unit','factor','version',...priceFields]
export function exportMaterialCsv(csv:string,prices:MaterialPrices){
 const regular=parsePriceCsv(csv).map(p=>['price',p.id,p.kind,p.category,p.item,p.unit,p.factor,p.version,p.unit_price,p.provisional?'仮値':'公表値',p.source_ref,'','','',''])
 const packages=PACKAGES.map(p=>{const price=prices[p.id];return ['package',p.id,'造作','',p.name,p.unit,'',PACKAGE_VERSION,...(price?priceValues(price):[p.provisional_price,'仮値',catalog.sources.S04.title,'','','',p.spec])]})
 return encode([materialHeaders,...regular,...packages])
}
export function importMaterialCsv(csv:string){
 const rows:PriceRow[]=[],packagePrices:MaterialPrices={},seen=new Set<string>()
 for(const r of records(csv,materialHeaders)){const key=r.id!;if(!key||seen.has(key))throw Error(`IDが空または重複：${key}`);seen.add(key)
 if(r.record_type==='price'){if(!['仮値','公表値'].includes(r.price_status!))throw Error('単価区分が不正です');rows.push(PriceRowSchema.parse({id:key,kind:r.kind,category:r.category,item:r.item,unit:r.unit,factor:number(r.factor!),version:r.version,unit_price:number(r.unit_price!),provisional:r.price_status==='仮値',source_ref:r.source}))}
 else if(r.record_type==='package'){const p=PACKAGES.find(p=>p.id===key);if(!p||p.unit!==r.unit||r.version!==PACKAGE_VERSION)throw Error(`仕様ID・単位・版が一致しません：${key}`);const price=readPrice(r);if(price)packagePrices[key]=price}
 else throw Error('record_typeはpriceまたはpackageです')
 }return {priceCsv:serializePriceCsv(rows),packagePrices}
}
export function applyMaterialPrices(selections:Record<string,SpecSelection>,prices:MaterialPrices){return Object.fromEntries(Object.entries(selections).map(([id,s])=>[id,s.price||!prices[s.packageId]?s:{...s,price:prices[s.packageId]}]))}
