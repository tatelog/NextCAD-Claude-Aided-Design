import {useMemo,useState} from 'react'
import {useFloorPlans} from '../store/floorPlans'
import {useDrawing} from '../store/drawing'
import {readUnitPlan,type UnitPlan39} from '../plan/unitPlan39'
import {clearEntry} from '../plan/entryClearance'
import {exportSavedPlan} from '../bimExchange/integration/exportSavedPlan'
import {buildZip} from '../export/zipWriter'
import type {UnitSpecifications} from '../bimExchange/intermediate/unitGeometry'
import type {MeshScene} from '../bimExchange/conversion/types'

function Preview({scene}:{scene:MeshScene}){
 const faces=useMemo(()=>scene.meshes.flatMap(m=>{
 const p=(i:number)=>{const x=m.vertices[i*3]!,y=m.vertices[i*3+1]!,z=m.vertices[i*3+2]!;return {x:(x-y)*.7,y:(x+y)*.25-z}}
 return Array.from({length:m.indices.length/3},(_,i)=>({kind:m.kind,pts:m.indices.slice(i*3,i*3+3).map(p)}))
 }),[scene])
 const pts=faces.flatMap(f=>f.pts),xs=pts.map(p=>p.x),ys=pts.map(p=>p.y)
 const xmin=xs.reduce((a,b)=>Math.min(a,b),Infinity),ymin=ys.reduce((a,b)=>Math.min(a,b),Infinity),w=xs.reduce((a,b)=>Math.max(a,b),-Infinity)-xmin,h=ys.reduce((a,b)=>Math.max(a,b),-Infinity)-ymin
 if(!pts.length)return null
 return <svg role="img" aria-label="保存済み平面から生成した3Dモデル" viewBox={`${xmin-500} ${ymin-500} ${w+1000} ${h+1000}`} style={{width:'100%',height:320,background:'#f0f4f8'}}>{faces.map((f,i)=><polygon key={i} points={f.pts.map(p=>`${p.x},${p.y}`).join(' ')} fill={f.kind==='wall'?'#cad8e6':f.kind==='column'?'#6c7a89':'#b1c9b9'} stroke="#546477" strokeWidth={12}/>)}</svg>
}
export function BimExportPanel(){
 const plans=useFloorPlans(s=>s.plans),source=useFloorPlans(s=>s.source),height=useDrawing(s=>s.storeyHeightMm)
 const [estimated,setEstimated]=useState(false),[error,setError]=useState('')
 const [dims,setDims]=useState({exteriorWallMm:200,partitionWallMm:115,doorHeightMm:2100,windowHeightMm:1200,windowSillMm:900})
 const [built,setBuilt]=useState<{signature:string;out:ReturnType<typeof exportSavedPlan>}|null>(null)
 const signature=JSON.stringify({plans,source,height,estimated,dims}),current=built?.signature===signature?built.out:null
 const generate=()=>{try{
 const unitPlansByFloor:Record<number,Record<string,UnitPlan39>>={}
 const unitSpecificationsByFloor:Record<number,Record<string,UnitSpecifications>>={}
 for(const [floor,plan] of Object.entries(plans)){
 unitPlansByFloor[Number(floor)]={}
 unitSpecificationsByFloor[Number(floor)]={}
 for(const cell of plan.cells){const detail=plan.unitPlanOverrides?.[cell.id]??readUnitPlan(plan.unitTypeIdsByCell?.[cell.id]??'',plan.unitPlanVariants?.[cell.id]??'A');if(detail){const resolved=clearEntry(detail);unitPlansByFloor[Number(floor)]![cell.id]=resolved
 if(estimated)unitSpecificationsByFloor[Number(floor)]![cell.id]={openings:Object.fromEntries(resolved.windows.flatMap(w=>{const r=resolved.rooms.find(r=>r.id===w.room_id);if(!r)return [];const horizontal=w.side==='N'||w.side==='S',length=horizontal?r.w:r.h,start=horizontal?r.x:r.y;return [[w.id,{widthMm:length*.5,startMm:start+length*.25,heightMm:dims.windowHeightMm,baseOffsetMm:200+dims.windowSillMm,status:'estimated' as const}]]}))}
 }}
 }
 const options={slabThicknessMm:200,unitPlansByFloor,...(estimated?{detailDimensions:dims,unitSpecificationsByFloor}:{})}
 const out=exportSavedPlan({source,plans,storeyHeightMm:height,adapterOptions:options})
 setBuilt({signature,out});setError('')
 }catch(e){setBuilt(null);setError(e instanceof Error?e.message:String(e))}}
 const save=()=>{if(!current)return;const enc=new TextEncoder(),bytes=buildZip(current.files.map(f=>({path:f.path,data:enc.encode(f.text)}))),url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/zip'}));const a=document.createElement('a');a.href=url;a.download='平面から3D-IFC.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return <section aria-label="平面から3D・IFC" style={{padding:20,border:'1px solid #b5c6db',borderRadius:10,marginBottom:24}}>
 <h3 style={{marginTop:0}}>平面から3D・IFCを作成</h3>
 <p>保存済みの{Object.keys(plans).length}階分の平面を立体化します。建物の幅や住戸配置は変更しません。</p>
 <label><input type="checkbox" checked={estimated} onChange={e=>setEstimated(e.target.checked)}/>未確定の壁・開口に概算寸法を使う</label>
 {estimated&&<div style={{padding:12,background:'#fff8e9'}}><p>以下はモデル作成用の仮定です。構造・仕様が確定した寸法ではありません。床版は計画条件の200 mm、壁高さは階高から床版厚を引いた値です。窓の幅・位置は平面の表示（室の辺の中央半分）から採用する概算です。</p>{(Object.entries(dims) as [keyof typeof dims,number][]).map(([k,v])=><label key={k} style={{display:'inline-flex',gap:8,margin:6}}>{{exteriorWallMm:'外周・戸境壁厚',partitionWallMm:'室内間仕切り厚',doorHeightMm:'扉の開口高さ',windowHeightMm:'窓の開口高さ',windowSillMm:'窓台高さ'}[k]}（mm）<input type="number" min={k==='windowSillMm'?0:1} value={v} onChange={e=>setDims(d=>({...d,[k]:Number(e.target.value)}))} style={{width:85}}/></label>)}</div>}
 <div style={{display:'flex',gap:12,marginTop:16}}><button type="button" onClick={generate} disabled={!Object.keys(plans).length}>平面から3Dモデルを作成</button><button type="button" onClick={save} disabled={!current}>中間JSON・3D・IFCを ZIP で保存</button></div>
 {!Object.keys(plans).length&&<p>平面画面で配置を作成してください。</p>}
 {built&&!current&&<p role="status">平面または条件が変更されています。モデルを作成し直してください。</p>}
 {error&&<p role="alert">{error}</p>}
 {current&&<><p role="status">{current.scene.meshes.length}個の立体形状を生成しました。{current.manifest.status==='partial'?'未確定・対象外の要素は結果一覧に残しています。':''}</p><Preview scene={current.scene}/><p>保存内容：中間JSON、3DメッシュJSON、OBJ、IFC4、変換結果一覧。</p><details><summary>変換結果・未確定項目</summary><ul>{current.manifest.issues.map((i,n)=><li key={n}>{i.elementId&&<code>{i.elementId}：</code>}{i.message}</li>)}</ul></details></>}
 </section>
}
