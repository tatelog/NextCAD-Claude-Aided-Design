import type { IntermediateModel, Issue, Point } from './types'
import { prepare } from './validation'
// STEP文字列: ASCII以外とバックスラッシュはUTF-16のX2表記にする。
function str(value:string) {let out="'";for(let i=0;i<value.length;i++){const code=value.charCodeAt(i),c=value[i]!;out+=c==="'"?"''":code<32||code>126||c==='\\'?`\\X2\\${code.toString(16).toUpperCase().padStart(4,'0')}\\X0\\`:c}return out+"'"}
const num=(n:number)=>{const s=String(n);return /[.eE]/.test(s)?s.toUpperCase():s+'.'}
export type IfcSchema = 'IFC4' | 'IFC2X3'
export function intermediateToIfc(model:IntermediateModel,schema:IfcSchema='IFC4'):{ifcText:string;issues:Issue[]} {
 if(schema!=='IFC4'&&schema!=='IFC2X3')throw new Error('未対応のIFCスキーマです')
 const {elements,issues}=prepare(model),lines:string[]=[]
 const add=(s:string)=>{lines.push(`#${lines.length+1}=${s};`);return `#${lines.length}`}
 // IFCの22文字GlobalId。ファイルを跨ぐID追跡には明示的なIntermediateIdを使う。
 const chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$'
 const guid=()=>{const bytes=crypto.getRandomValues(new Uint8Array(16));let n=0n;for(const b of bytes)n=(n<<8n)|BigInt(b);let s='';for(let i=0;i<22;i++){s=chars[Number(n&63n)]!+s;n>>=6n}return str(s)}
 // IFC2X3の全IfcRoot派生に必須。実在の設計者を推測せず生成処理を記録する。
 let owner='$'
 if(schema==='IFC2X3'){
  const person=add("IFCPERSON($,'Unspecified exporter',$,$,$,$,$,$)")
  const organization=add("IFCORGANIZATION($,'BIM exchange',$,$,$)")
  const actor=add(`IFCPERSONANDORGANIZATION(${person},${organization},$)`)
  const application=add(`IFCAPPLICATION(${organization},'1','BIM exchange','BIMExchange')`)
  owner=add(`IFCOWNERHISTORY(${actor},${application},$,.ADDED.,$,$,$,${Math.floor(Date.now()/1000)})`)
 }
 const origin=add('IFCCARTESIANPOINT((0.,0.,0.))'),z=add('IFCDIRECTION((0.,0.,1.))'),x=add('IFCDIRECTION((1.,0.,0.))')
 const axis=(height:number)=>add(`IFCAXIS2PLACEMENT3D(${height===0?origin:add(`IFCCARTESIANPOINT((0.,0.,${num(height)}))`)},${z},${x})`)
 const zero=axis(0),placement=(parent:string,height:number)=>add(`IFCLOCALPLACEMENT(${parent},${height===0?zero:axis(height)})`)
 const context=add(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,0.000001,${zero},$)`)
 const unit=add('IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.)'),units=add(`IFCUNITASSIGNMENT((${unit}))`)
 const project=add(`IFCPROJECT(${guid()},${owner},'Intermediate model',$,$,$,$,(${context}),${units})`)
 const sitePlace=placement('$',0),site=add(`IFCSITE(${guid()},${owner},'Site',$,$,${sitePlace},$,$,.ELEMENT.,$,$,$,$,$)`)
 const buildingPlace=placement(sitePlace,0),building=add(`IFCBUILDING(${guid()},${owner},'Building',$,$,${buildingPlace},$,$,.ELEMENT.,$,$,$)`)
 const aggregate=(parent:string,children:string[])=>{if(children.length)add(`IFCRELAGGREGATES(${guid()},${owner},$,$,${parent},(${children.join(',')}))`)}
 aggregate(project,[site]);aggregate(site,[building])
 const storeys=new Map<string,{ref:string;place:string;elevation:number;products:string[]}>()
 for(const s of model.storeys){const place=placement(buildingPlace,s.elevationMm),ref=add(`IFCBUILDINGSTOREY(${guid()},${owner},${str(s.name)},$,$,${place},$,$,.ELEMENT.,${num(s.elevationMm)})`);storeys.set(s.id,{ref,place,elevation:s.elevationMm,products:[]})}
 aggregate(building,[...storeys.values()].map(s=>s.ref))
 const polyline=(points:Point[])=>{const refs=points.map(p=>add(`IFCCARTESIANPOINT((${num(p.x)},${num(p.y)}))`));return add(`IFCPOLYLINE((${[...refs,refs[0]!].join(',')}))`)}
 const products=new Map<string,string>(),placements=new Map<string,string>()
 for(const e of [...elements.filter(e=>e.kind!=='opening'),...elements.filter(e=>e.kind==='opening')]){const g=e.geometry!,storey=storeys.get(e.storeyId)!,outer=polyline(g.outer)
  const profile=g.holes.length?add(`IFCARBITRARYPROFILEDEFWITHVOIDS(.AREA.,$,${outer},(${g.holes.map(polyline).join(',')}))`):add(`IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,${outer})`)
  const solid=add(`IFCEXTRUDEDAREASOLID(${profile},${zero},${z},${num(g.heightMm)})`),representation=add(`IFCSHAPEREPRESENTATION(${context},'Body','SweptSolid',(${solid}))`),shape=add(`IFCPRODUCTDEFINITIONSHAPE($,$,(${representation}))`)
  const host=e.kind==='opening'?elements.find(h=>h.id===e.hostElementId):undefined
  const place=host?placement(placements.get(host.id)!,g.zMm-host.geometry!.zMm):placement(storey.place,g.zMm-storey.elevation)
  placements.set(e.id,place)
  const entity=e.kind==='opening'?'IFCOPENINGELEMENT':e.kind==='wall'?'IFCWALL':e.kind==='column'?'IFCCOLUMN':e.kind==='beam'?'IFCBEAM':'IFCSLAB'
  const predefined=e.kind==='slab'||e.kind==='balcony'?'.FLOOR.':'.NOTDEFINED.'
  const typeAttribute=schema==='IFC4'||entity==='IFCSLAB'?(','+predefined):''
  const product=add(`${entity}(${guid()},${owner},${str(e.id)},$,${str(e.kind)},${place},${shape},${str(e.id)}${typeAttribute})`);products.set(e.id,product);if(e.kind!=='opening')storey.products.push(product)
  const properties:Record<string,string>={IntermediateId:e.id,SourceElementIds:JSON.stringify(e.source.elementIds),SourceOrigin:e.source.origin,Status:e.status,Kind:e.kind,StoreyId:e.storeyId}
  if(e.hostElementId)properties.HostElementId=e.hostElementId
  if(e.source.note!==undefined)properties.SourceNote=e.source.note
  const props=Object.entries(properties).map(([key,value])=>add(`IFCPROPERTYSINGLEVALUE(${str(key)},$,IFCTEXT(${str(value)}),$)`))
  const pset=add(`IFCPROPERTYSET(${guid()},${owner},'BIM_Intermediate',$,(${props.join(',')}))`)
  add(`IFCRELDEFINESBYPROPERTIES(${guid()},${owner},$,$,(${product}),${pset})`)
 }
 for(const e of elements)if(e.kind==='opening')add(`IFCRELVOIDSELEMENT(${guid()},${owner},$,$,${products.get(e.hostElementId!)!},${products.get(e.id)!})`)
 for(const s of storeys.values())if(s.products.length)add(`IFCRELCONTAINEDINSPATIALSTRUCTURE(${guid()},${owner},$,$,(${s.products.join(',')}),${s.ref})`)
 const ifcText=`ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('BIM intermediate conversion'),'2;1');\nFILE_NAME('intermediate.ifc','${new Date().toISOString()}',(''),(''),'BIM exchange','BIM exchange','');\nFILE_SCHEMA(('${schema}'));\nENDSEC;\nDATA;\n${lines.join('\n')}\nENDSEC;\nEND-ISO-10303-21;\n`
 return {ifcText,issues}
}




