import { SLAB_THICKNESS_MM } from '../../plan/buildingDimensions'
import polygonClipping from 'polygon-clipping'
import type { AutoPlan } from '../../plan/autoPlan'
import type { UnitPlan39 } from '../../plan/unitPlan39'
import type { PlanSnapshot, Point, SnapshotElement } from './schema'
import { storeySchema } from './schema'
import { normalizeRing, polygon, validFootprint } from './geometry'
import { unitElements, type UnitSpecifications } from './unitGeometry'

export interface DetailDimensions {
  exteriorWallMm:number; partitionWallMm:number; doorHeightMm:number
  windowHeightMm:number; windowSillMm:number; columnWidthMm?:number; columnDepthMm?:number
}

export interface FloorPlansSnapshot {
  /** useFloorPlans.getState()からsource/plansだけをコピーして渡せる。 */
  source: string
  plans: Record<number, AutoPlan>
  /** 階番号と高さは呼出元が明示する。未保存階は複製しない。 */
  storeys: (PlanSnapshot['storeys'][number] & { floor: number })[]
  /** 省略時200mmは引継ぎ条件による概算。 */
  slabThicknessMm?: number
  /** 元平面はy下向き。省略時はyを反転して右手系へ変換。 */
  yAxis?: 'down' | 'up'
  /** 保存済override以外の住戸マスタは呼出元で解決。cell IDキー。 */
  unitPlansByFloor?: Record<number, Record<string, UnitPlan39>>
  /** 利用者が概算寸法を使う場合だけ明示。壁は床版上から次階基準までのモデル高さ。 */
  detailDimensions?: DetailDimensions
  /** 詳細指定。省略値は未解決。仕様明細の個別値を接続する場合に使用する。 */
  specifications?: UnitSpecifications
  unitSpecificationsByFloor?: Record<number, Record<string, UnitSpecifications>>
  /** 断面・高さを確認済み/概算で持つ描画要素は正規化入力で追加できる。XYは既に右手系。 */
  additionalElements?: SnapshotElement[]
}
type Rect={x0:number;x1:number;y0:number;y1:number}
const rectPoints=(r:Rect):Point[]=>{
  if(![r.x0,r.x1,r.y0,r.y1].every(Number.isFinite)||r.x1<=r.x0||r.y1<=r.y0) throw new Error('矩形の寸法・座標が無効です')
  return [{x:r.x0,y:r.y0},{x:r.x1,y:r.y0},{x:r.x1,y:r.y1},{x:r.x0,y:r.y1}]
}

export function autoPlanToSnapshot(input: FloorPlansSnapshot): PlanSnapshot {
  const thickness=input.slabThicknessMm??SLAB_THICKNESS_MM
  if(!Number.isFinite(thickness)||thickness<=0) throw new Error('床版厚は正の有限数で指定してください')
  const result:PlanSnapshot={storeys:[],elements:[],issues:[]}
  const floorIds=new Set<number>(),storeyIds=new Set<string>()
  for(const s of input.storeys) {
    if(!Number.isInteger(s.floor)||floorIds.has(s.floor)||storeyIds.has(s.id)) throw new Error('階番号または階IDが不正・重複しています')
    floorIds.add(s.floor);storeyIds.add(s.id)
  }
  for(const [key,plan] of Object.entries(input.plans)) {
    const floor=Number(key), metadata=input.storeys.find(s=>s.floor===floor)
    if(!metadata) throw new Error(`保存階${key}の階情報がありません`)
    const {floor:_floor,...rawStorey}=metadata
    const storey=storeySchema.parse(rawStorey)
    result.storeys.push(storey)
    const xy=(p:Point)=>({x:p.x,y:input.yAxis==='up'?p.y:-p.y})
    const source=(ids:string[],note:string):SnapshotElement['source']=>({elementIds:[storey.id,`floor:${key}`,...(input.source?[input.source]:[]),...ids],origin:'plan',note})
    const add=(localId:string,kind:SnapshotElement['kind'],ids:string[],footprint:SnapshotElement['footprint'],heightMm:number|null,status:SnapshotElement['status'],note:string)=>{
      result.elements.push({id:JSON.stringify([storey.id,localId]),kind,storeyId:storey.id,footprint,heightMm,baseOffsetMm:0,status,source:source(ids,note)})
    }
    const outline=plan.buildingOutline?.length?[...plan.buildingOutline]:rectPoints({x0:0,y0:0,x1:plan.widthMm,y1:plan.depthMm})
    const base=normalizeRing(outline.map(xy),true)
    if(!validFootprint(base,[])) throw new Error(`階${key}の外形が無効です`)
    const voids=(plan.voids??[]).map(v=>polygon(normalizeRing(rectPoints(v).map(xy),true)))
    const balconyShapes=(plan.balconies??[]).map(b=>polygon(normalizeRing(rectPoints(b).map(xy),true)))
    for(const p of [...voids,...balconyShapes]) if(!validFootprint(p[0]!.map(([x,y])=>({x,y})),[])) throw new Error(`階${key}の矩形が無効です`)
    const emitParts=(localId:string,kind:'slab'|'balcony',ids:string[],shape:polygonClipping.MultiPolygon)=>{
      if(!shape.length) add(localId,kind,ids,null,null,'unresolved','重複または吹抜け控除で実体が残らないため元要素のみ保持')
      shape.forEach((poly,i)=>add(`${localId}:${i}`,kind,ids,{outer:normalizeRing(poly[0]!.map(([x,y])=>({x,y})),true),holes:poly.slice(1).map(r=>normalizeRing(r.map(([x,y])=>({x,y})),false))},thickness,'estimated','床版上下面の基準は階基準から上方へ押出し。厚さは計画条件。構造設計未確認'))
    }
    const subtract=(p:polygonClipping.Polygon, clips:polygonClipping.Polygon[])=>clips.length?polygonClipping.difference(p,...clips):[p]
    emitParts('slab','slab',['buildingOutline',...(plan.voids??[]).map(v=>v.id)],subtract(polygon(base),[...balconyShapes,...voids]))
    ;(plan.balconies??[]).forEach((b,i)=>{
      emitParts(`balcony:${b.id}`,'balcony',[b.id,b.unitId,...(plan.voids??[]).map(v=>v.id)],subtract(balconyShapes[i]!,[...voids,...balconyShapes.slice(0,i)]))
      if(b.access) add(`balcony-opening:${b.id}`,'opening',[b.id,b.unitId],null,null,'unresolved','バルコニー出入口の高さ・壁厚が未指定')
    })
    for(const v of plan.voids??[]) add(`void:${v.id}`,'opening',[v.id],{outer:normalizeRing(rectPoints(v).map(xy),true),holes:[]},thickness,'estimated','床版から控除済みの吹抜け領域。別実体として加算しない')
    for(const room of plan.rooms) add(`space:${room.id}`,'space',[room.id],{outer:normalizeRing(rectPoints(room).map(xy),true),holes:[]},storey.heightMm,'estimated','室内有効高さではなく階高による概算空間')
    for(const core of plan.cores) add(`core:${core.id}`,core.id==='evHall'?'space':'stair',[core.id],null,null,'unresolved','階段の段・踊場形状、またはコア詳細は未指定')
    for(let i=0;i<outline.length;i++) add(`exterior-wall:${i}`,'wall',['buildingOutline'],null,null,'unresolved','外形辺からの壁候補。壁厚・高さは未確定')
    for(const cell of plan.cells) {
      const detail=input.unitPlansByFloor?.[floor]?.[cell.id]??plan.unitPlanOverrides?.[cell.id]
      if(!detail) {
        result.issues!.push({code:'UNIT_DETAIL_UNAVAILABLE',severity:'warning',message:`${storey.id}/${cell.id}: 住戸詳細が未提供のため柱・開口を抽出できません`})
        continue
      }
      const d=input.detailDimensions
      if(d && Object.entries(d).some(([key,n])=>!Number.isFinite(n)||(key==='windowSillMm'?n<0:n<=0))) throw new Error('概算寸法が無効です')
      const vertical={heightMm:storey.heightMm-thickness,baseOffsetMm:thickness,status:'estimated' as const}
      const assumed:UnitSpecifications=d?{
        envelopeWall:{...vertical,thicknessMm:d.exteriorWallMm},partitionWall:{...vertical,thicknessMm:d.partitionWallMm},
        door:{heightMm:d.doorHeightMm,baseOffsetMm:thickness,status:'estimated'},
        column:{...vertical,...(d.columnWidthMm===undefined?{}:{widthMm:d.columnWidthMm}),...(d.columnDepthMm===undefined?{}:{depthMm:d.columnDepthMm})},
        openings:Object.fromEntries(detail.windows.map(w=>[w.id,{heightMm:d.windowHeightMm,baseOffsetMm:thickness+d.windowSillMm,status:'estimated' as const}]))
      }:{}
      const spec={...assumed,...input.specifications,...input.unitSpecificationsByFloor?.[floor]?.[cell.id]}
      const unit=unitElements(plan,cell,detail,storey.id,spec,xy)
      for(const e of unit.elements) e.source.elementIds=[storey.id,`floor:${key}`,...(input.source?[input.source]:[]),...e.source.elementIds]
      if(d) for(const e of unit.elements) e.source.note+='。利用者選択の概算寸法。壁高は階高−床版厚、基準高さは床版上面'
      result.elements.push(...unit.elements)
      result.issues!.push(...unit.issues)
    }
  }
  result.elements.push(...structuredClone(input.additionalElements??[]))
  return result
}
