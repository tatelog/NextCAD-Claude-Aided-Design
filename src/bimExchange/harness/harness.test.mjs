import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runConversion, validateModel } from './index.mjs';
const root = fileURLToPath(new URL('./evidence/', import.meta.url));
const model = () => ({schemaVersion:'bim-intermediate/1',units:'mm',coordinateSystem:'right-handed-z-up',storeys:[{id:'s1',name:'階',elevationMm:3000,heightMm:3000}],elements:[{id:'w1',kind:'wall',storeyId:'s1',geometry:{type:'extrudedPolygon',outer:[{x:0,y:0},{x:200,y:0},{x:200,y:100}],holes:[],zMm:3000,heightMm:2000},source:{elementIds:['original'],origin:'estimate'},status:'estimated'}],issues:[]});
const converters = {mode:'mock',intermediateToIfc: m => ({ifcText:'ISO-10303-21;\nEND-ISO-10303-21;',issues:[]}),intermediateToScene:m=>({meshes:m.elements.map(e=>({elementId:e.id,vertices:[0,0,e.geometry.zMm],indices:[]})),issues:[]})};
test('共通契約・参照・有限座標を検証する',()=>{
 assert.deepEqual(validateModel(model()),[]);
 for(const mutate of [m=>m.units='m',m=>m.elements[0].storeyId='absent',m=>m.elements.push(m.elements[0]),m=>m.elements[0].geometry.heightMm=-1,m=>m.elements[0].geometry.outer[0].x=Infinity,m=>m.elements[0].source.origin='unknown',m=>m.issues=[{}]]){const m=model();mutate(m);assert.ok(validateModel(m).length);}
});
test('未解決要素と推定を保持し確定済みフォルダへ保存する',async()=>{
 const parent=await mkdtemp(path.join(root,'run-'));const outputDir=path.join(parent,'result');const m=model();m.elements.push({...m.elements[0],id:'missing',geometry:null,status:'unresolved'});
 const result=await runConversion({model:m,outputDir,converters:{...converters,intermediateToScene:()=>({meshes:[],issues:[]})}});
 assert.equal(result.exitCode,0);assert.equal(result.manifest.converterMode,'mock');assert.equal(result.manifest.status,'partial');assert.equal(result.manifest.elements[0].status,'estimated');assert.ok(result.manifest.issues.some(i=>i.elementId==='missing'));
 assert.deepEqual((await readdir(outputDir)).sort(),['manifest.json','model.ifc','scene.json']);assert.equal(JSON.parse(await readFile(path.join(outputDir,'manifest.json'),'utf8')).schemaVersion,'bim-conversion-manifest/1');
});
test('不正入力では変換・保存しない',async()=>{let called=false;const result=await runConversion({model:{},outputDir:path.join(root,'invalid'),converters:{...converters,intermediateToIfc:()=>{called=true;}}});assert.equal(result.exitCode,3);assert.equal(called,false);});
test('変換エラーでは出力を確定しない',async()=>{const parent=await mkdtemp(path.join(root,'failure-'));const result=await runConversion({model:model(),outputDir:path.join(parent,'result'),converters:{...converters,intermediateToIfc:()=>{throw Error('変換不可');}}});assert.equal(result.exitCode,4);assert.deepEqual(await readdir(parent),[]);});
test('既存出力は上書きしない',async()=>{const parent=await mkdtemp(path.join(root,'exists-'));const result=await runConversion({model:model(),outputDir:parent,converters});assert.equal(result.exitCode,5);assert.deepEqual(await readdir(parent),[]);});
test('循環参照のsceneは保存前に失敗する',async()=>{const parent=await mkdtemp(path.join(root,'cycle-'));const scene={};scene.self=scene;const result=await runConversion({model:model(),outputDir:path.join(parent,'result'),converters:{...converters,intermediateToScene:()=>scene}});assert.equal(result.exitCode,4);assert.deepEqual(await readdir(parent),[]);});
