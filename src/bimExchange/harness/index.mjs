import { mkdir, writeFile, rename, lstat, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const string = v => typeof v === 'string' && v.trim().length > 0;
const finite = Number.isFinite;
const issueValid = v => object(v) && string(v.code) && ['info','warning','error'].includes(v.severity) && string(v.message) && (v.elementId === undefined || string(v.elementId));
export function validateModel(m) {
 const errors=[];const fail=(at,message)=>errors.push({code:'INVALID_INPUT',severity:'error',message:`${at}: ${message}`});
 if(!object(m)){fail('$','オブジェクトが必要');return errors;}
 for(const [key,value] of Object.entries({schemaVersion:'bim-intermediate/1',units:'mm',coordinateSystem:'right-handed-z-up'}))if(m[key]!==value)fail(key,`${value} が必要`);
 if(!Array.isArray(m.storeys)||!Array.isArray(m.elements)||!Array.isArray(m.issues)){fail('$','storeys/elements/issues 配列が必要');return errors;}
 const storeys=new Set(),ids=new Set();
 m.storeys.forEach((s,i)=>{if(!object(s)||!string(s.id)||!string(s.name)||!finite(s.elevationMm)||!finite(s.heightMm)||s.heightMm<=0){fail(`storeys[${i}]`,'階定義が不正');return;}if(storeys.has(s.id))fail(`storeys[${i}]`,'ID重複');storeys.add(s.id);});
 const ring=(points,at)=>{if(!Array.isArray(points)||points.length<3){fail(at,'3頂点以上が必要');return;}if(points.some(p=>!object(p)||!finite(p.x)||!finite(p.y))){fail(at,'有限座標が必要');return;}const first=points[0],last=points.at(-1);if(first.x===last.x&&first.y===last.y)fail(at,'終点重複は禁止');const area=points.reduce((a,p,i)=>{const q=points[(i+1)%points.length];return a+p.x*q.y-q.x*p.y;},0);if(!finite(area)||area===0)fail(at,'面積が不正');};
 m.elements.forEach((e,i)=>{const at=`elements[${i}]`;if(!object(e)){fail(at,'要素が不正');return;}if(!string(e.id)||ids.has(e.id))fail(at,'ID不正または重複');ids.add(e.id);if(!['wall','column','beam','slab','opening','space','stair','balcony','other'].includes(e.kind))fail(at,'kind不正');if(!storeys.has(e.storeyId))fail(at,'階参照なし');if(!['confirmed','estimated','unresolved'].includes(e.status))fail(at,'status不正');const s=e.source;if(!object(s)||!Array.isArray(s.elementIds)||s.elementIds.some(id=>!string(id))||!['plan','user','estimate'].includes(s.origin)||(s.note!==undefined&&typeof s.note!=='string'))fail(at,'source不正');const g=e.geometry;if(g===null)return;if(!object(g)||g.type!=='extrudedPolygon'||!finite(g.zMm)||!finite(g.heightMm)||g.heightMm<=0||!Array.isArray(g.holes)){fail(at,'geometry不正');return;}ring(g.outer,`${at}.outer`);g.holes.forEach((h,j)=>ring(h,`${at}.holes[${j}]`));});
 m.issues.forEach((v,i)=>{if(!issueValid(v))fail(`issues[${i}]`,'issue不正');});return errors;
}
const errorResult=(exitCode,code,message,issues=[])=>({exitCode,error:{code,message},issues});
export async function runConversion({model,outputDir,converters}) {
 const errors=validateModel(model);if(errors.length)return errorResult(3,'INVALID_INPUT','中間モデルが契約に適合しません',errors);
 if(!string(outputDir))return errorResult(2,'USAGE','出力先が必要です');
 if(!converters||typeof converters.intermediateToIfc!=='function'||typeof converters.intermediateToScene!=='function'||!['real','mock'].includes(converters.mode))return errorResult(4,'CONVERTER_UNAVAILABLE','変換器または実行モードが不正です');
 const target=path.resolve(outputDir);let stage;let files;
 try{await lstat(target);return errorResult(5,'OUTPUT_EXISTS','既存出力先は上書きできません');}catch(e){if(e.code!=='ENOENT')return errorResult(5,'OUTPUT_IO',e.message);}
 let manifest;
 try {
  const snapshot=structuredClone(model);
  const ifc=await converters.intermediateToIfc(structuredClone(snapshot));
  const scene=await converters.intermediateToScene(structuredClone(snapshot));
  if(!object(ifc)||!string(ifc.ifcText)||!Array.isArray(ifc.issues)||ifc.issues.some(i=>!issueValid(i)))throw Error('IFC変換器の戻り値が不正です');
  if(!object(scene))throw Error('sceneがオブジェクトではありません');
  if(scene.issues!==undefined&&(!Array.isArray(scene.issues)||scene.issues.some(i=>!issueValid(i))))throw Error('scene issuesが不正です');
  const sceneText=JSON.stringify(scene,(_k,v)=>{if(typeof v==='number'&&!finite(v)||typeof v==='function'||typeof v==='undefined'||typeof v==='symbol')throw Error('sceneがJSON互換ではありません');return v;},2)+'\n';
  const issues=[...snapshot.issues,...ifc.issues,...(scene.issues??[])];
  for(const e of snapshot.elements)if(e.geometry===null||e.status==='unresolved')issues.push({code:'UNRESOLVED_ELEMENT',severity:'warning',elementId:e.id,message:'未解決要素です。形状・寸法を補完していません。'});
  const hash=text=>createHash('sha256').update(text).digest('hex');
  manifest={schemaVersion:'bim-conversion-manifest/1',createdAt:new Date().toISOString(),converterMode:converters.mode,status:issues.some(i=>i.severity!=='info')?'partial':'complete',inputSha256:hash(JSON.stringify(snapshot)),units:snapshot.units,coordinateSystem:snapshot.coordinateSystem,elements:snapshot.elements.map(e=>({id:e.id,kind:e.kind,storeyId:e.storeyId,status:e.status,source:e.source,hasGeometry:e.geometry!==null})),issues,artifacts:[{path:'model.ifc',sha256:hash(ifc.ifcText)},{path:'scene.json',sha256:hash(sceneText)}],notice:'参考モデル。構造設計・確認申請済みを意味しません。'};
  files={'model.ifc':ifc.ifcText,'scene.json':sceneText,'manifest.json':JSON.stringify(manifest,null,2)+'\n'};
 }catch(e){return errorResult(4,'CONVERSION_FAILED',e.message);}
 const lock=`${target}.bim-lock`;
 let locked=false;
 try {
  await mkdir(path.dirname(target),{recursive:true});await mkdir(lock);locked=true;
  try{await lstat(target);throw Error('既存出力先は上書きできません');}catch(e){if(e.code!=='ENOENT')throw e;}
  stage=path.join(path.dirname(target),`.bim-${randomUUID()}.tmp`);await mkdir(stage);
  for(const [name,text] of Object.entries(files))await writeFile(path.join(stage,name),text,{encoding:'utf8',flag:'wx'});
  await rename(stage,target);stage=undefined;
  return {exitCode:0,outputDir:target,manifest};
 }catch(e){return errorResult(5,'OUTPUT_IO',e.message);}
 finally {
  if(stage){for(const name of Object.keys(files))await unlink(path.join(stage,name)).catch(()=>{});await rmdir(stage).catch(()=>{});}
  if(locked)await rmdir(lock).catch(()=>{});
 }
}
