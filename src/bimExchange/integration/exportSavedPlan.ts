import type {AutoPlan} from '../../plan/autoPlan'
import {autoPlanToSnapshot,planToIntermediate,validateIntermediate,type FloorPlansSnapshot} from '../intermediate'
import {intermediateToIfc,intermediateToScene} from '../conversion'
import type {MeshScene} from '../conversion/types'

export interface SavedPlanInput {
 ifcSchema?:'IFC4'|'IFC2X3'
 source:string
 plans:Record<number,AutoPlan>
 storeyHeightMm:number
 adapterOptions?:Omit<FloorPlansSnapshot,'source'|'plans'|'storeys'>
}
function objOf(scene:MeshScene){
 const rows=['# BIM exchange; units: mm; right-handed Z-up'], offset={value:1}
 for(const [i,m] of scene.meshes.entries()){
 rows.push(`# source element: ${JSON.stringify(m.elementId)}`,`g element_${i}`)
 for(let j=0;j<m.vertices.length;j+=3)rows.push(`v ${m.vertices.slice(j,j+3).join(' ')}`)
 for(let j=0;j<m.indices.length;j+=3)rows.push(`f ${m.indices.slice(j,j+3).map(n=>n+offset.value).join(' ')}`)
 offset.value+=m.vertices.length/3
 }
 return rows.join('\n')+'\n'
}
/** 保存時点のコピーを使い、別階の複製・外形への代替・元データ変更をしない。 */
export function exportSavedPlan(input:SavedPlanInput){
 if(!Number.isFinite(input.storeyHeightMm)||input.storeyHeightMm<=0)throw new Error('階高を正の数で設定してください。')
 const floors=Object.keys(input.plans).map(Number).sort((a,b)=>a-b)
 if(!floors.length)throw new Error('保存済みの平面がありません。平面画面で配置を作成してください。')
 if(floors.some(f=>!Number.isInteger(f)||f<1))throw new Error('保存階の番号が不正です。')
 const sourceReference='saved-plan-source'
 const snapshot=autoPlanToSnapshot({...input.adapterOptions,source:sourceReference,plans:structuredClone(input.plans),storeys:floors.map(f=>({floor:f,id:`floor-${f}`,name:`${f}階`,elevationMm:(f-1)*input.storeyHeightMm,heightMm:input.storeyHeightMm}))})
 const model=planToIntermediate(snapshot),errors=validateIntermediate(model)
 if(errors.some(e=>e.severity==='error'))throw new Error(errors.map(e=>e.message).join('\n'))
 const scene=intermediateToScene(model),ifc=intermediateToIfc(model,input.ifcSchema)
 const issues=[...new Map([...model.issues,...scene.issues,...ifc.issues].map(i=>[JSON.stringify(i),i])).values()]
 const manifest={schemaVersion:'bim-export/1',source:input.source,sourceReferences:{[sourceReference]:input.source},createdAt:new Date().toISOString(),units:'mm',coordinateSystem:'right-handed-z-up',status:issues.some(i=>i.severity!=='info')?'partial':'complete',storeys:model.storeys,elementCount:model.elements.length,meshCount:scene.meshes.length,issues, note:'completeは変換処理の状態です。構造設計・申請適合の確定ではありません。'}
 if(!scene.meshes.length)throw new Error('立体化できる形状がありません。部材寸法を確認してください。')
 const json=(v:unknown)=>JSON.stringify(v,null,2)
 const files=[{path:'intermediate.json',text:json(model)},{path:'scene.json',text:json(scene)},{path:'model.ifc',text:ifc.ifcText},{path:'model.obj',text:objOf(scene)},{path:'manifest.json',text:json(manifest)}]
 return {model,scene,manifest,files}
}
