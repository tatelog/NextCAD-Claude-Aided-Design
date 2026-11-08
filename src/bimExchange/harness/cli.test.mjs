import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtemp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { main } from './cli.mjs';
const model={schemaVersion:'bim-intermediate/1',units:'mm',coordinateSystem:'right-handed-z-up',storeys:[],elements:[],issues:[]};
function io(text){const result={out:'',err:''};return {result,stdin:Readable.from([text]),stdout:{write:s=>result.out+=s},stderr:{write:s=>result.err+=s}};}
test('引数不正は2で一行JSON',async()=>{const stream=io('');assert.equal(await main(['--unknown','x'],stream),2);assert.equal(JSON.parse(stream.result.out).exitCode,2);});
test('JSON不正は3で変換器をロードしない',async()=>{const stream=io('{');assert.equal(await main(['--input','-','--output','unused'],stream,()=>{throw Error('呼出禁止');}),3);});
test('実変換器未着は4でmockへ置換しない',async()=>{const stream=io(JSON.stringify(model));assert.equal(await main(['--input','-','--output','unused'],stream,()=>{throw Error('未着');}),4);assert.equal(JSON.parse(stream.result.out).error.code,'CONVERTER_UNAVAILABLE');});
test('標準入力から変換し標準出力へ結果JSON',async()=>{const parent=await mkdtemp(path.join(fileURLToPath(new URL('./evidence/',import.meta.url)),'stdin-'));const stream=io(JSON.stringify(model));assert.equal(await main(['--input','-','--output',path.join(parent,'result')],stream,async()=>({mode:'mock',intermediateToIfc:()=>({ifcText:'ISO-10303-21;',issues:[]}),intermediateToScene:()=>({meshes:[]})})),0);assert.equal(JSON.parse(stream.result.out).manifest.converterMode,'mock');assert.equal(stream.result.err,'');});
