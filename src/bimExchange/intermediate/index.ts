import { intermediateSchema, snapshotSchema } from './schema'
import type { IntermediateModel, Issue, PlanSnapshot } from './schema'
import { normalizeRing, validFootprint } from './geometry'
export * from './schema'
export { autoPlanToSnapshot } from './autoPlanAdapter'
export type { FloorPlansSnapshot, DetailDimensions } from './autoPlanAdapter'
export type { UnitSpecifications, WallSpecification, OpeningSpecification, ColumnSpecification } from './unitGeometry'

export function validateIntermediate(input: unknown): Issue[] {
  const parsed=intermediateSchema.safeParse(input)
  if(!parsed.success) return parsed.error.issues.map(e=>({code:'SCHEMA_INVALID',severity:'error',message:`${e.path.join('.')}: ${e.message}`}))
  const model=parsed.data, issues:Issue[]=[], storeys=new Set<string>(), ids=new Set<string>()
  for(const s of model.storeys) {
    if(storeys.has(s.id)) issues.push({code:'DUPLICATE_STOREY',severity:'error',message:`階IDの重複: ${s.id}`})
    storeys.add(s.id)
  }
  for(const e of model.elements) {
    const add=(code:string,message:string)=>issues.push({code,severity:'error',elementId:e.id,message})
    if(ids.has(e.id)) add('DUPLICATE_ELEMENT','要素IDが重複しています')
    ids.add(e.id)
    if(!storeys.has(e.storeyId)) add('UNKNOWN_STOREY','参照先の階がありません')
    if(e.hostElementId!==undefined) {
      const host=model.elements.find(h=>h.id===e.hostElementId)
      if(e.kind!=='opening'||!host||host.kind!=='wall'||host.id===e.id||host.storeyId!==e.storeyId) add('INVALID_HOST','所属壁は同じ階の別のwall要素を参照し、openingにのみ指定できます')
    }
    if(!e.geometry && e.status!=='unresolved') add('NULL_GEOMETRY_STATUS','形状なしの要素は未解決にしてください')
    if(e.source.origin==='estimate' && e.status==='confirmed') add('ESTIMATE_CONFIRMED','概算由来を確定扱いにできません')
    if(e.geometry && !validFootprint(e.geometry.outer,e.geometry.holes)) add('INVALID_FOOTPRINT','外周または穴が無効です')
  }
  return issues
}

/** 副作用なし。欠損形状は要素として残し、壊れた契約・参照は例外にする。 */
export function planToIntermediate(snapshot: PlanSnapshot): IntermediateModel {
  const input=snapshotSchema.parse(snapshot)
  const issues:Issue[]=[...(input.issues??[])]
  const model:IntermediateModel={schemaVersion:'bim-intermediate/1',units:'mm',coordinateSystem:'right-handed-z-up',storeys:input.storeys,elements:[],issues}
  for(const e of input.elements) {
    const storey=input.storeys.find(s=>s.id===e.storeyId)
    if(!storey) throw new Error(`参照先の階がありません: ${e.storeyId}`)
    const outer=e.footprint?normalizeRing(e.footprint.outer,true):[],holes=e.footprint?.holes.map(h=>normalizeRing(h,false))??[]
    const usable=e.status!=='unresolved' && e.heightMm!==null && e.footprint!==null && validFootprint(outer,holes)
    const status=usable?(e.source.origin==='estimate'?'estimated':e.status):'unresolved'
    const geometry=usable?{type:'extrudedPolygon' as const,outer,holes,zMm:storey.elevationMm+e.baseOffsetMm,heightMm:e.heightMm!}:null
    if(!geometry) issues.push({code:'GEOMETRY_UNRESOLVED',severity:'warning',elementId:e.id,message:'断面・高さが未確定、または平面形状が無効のため形状を生成していません'})
    model.elements.push({id:e.id,kind:e.kind,storeyId:e.storeyId,...(e.hostElementId===undefined?{}:{hostElementId:e.hostElementId}),geometry,source:e.source,status})
  }
  const errors=validateIntermediate(model)
  if(errors.length) throw new Error(errors.map(e=>`${e.code}: ${e.message}`).join('\n'))
  return model
}
