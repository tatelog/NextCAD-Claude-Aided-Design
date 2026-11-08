import { readFile } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { registerHooks, createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { runConversion, validateModel } from './index.mjs';
export async function loadConverters() {
 const entry=new URL('../conversion/index.ts',import.meta.url);
 if(!existsSync(entry))throw Error('担当2の conversion/index.ts がありません');
 // 既存package/tsconfigを変更せず、ローカルTypeScriptを実行する。
 const require=createRequire(import.meta.url);const ts=require('typescript');
 const hooks=registerHooks({
  resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&context.parentURL){const base=new URL(specifier,context.parentURL);for(const suffix of ['.ts','/index.ts']){const url=new URL(base.href+suffix);if(existsSync(url))return {url:url.href,shortCircuit:true};}}throw error;}},
  load(url,context,next){if(url.startsWith('file:')&&url.endsWith('.ts'))return {format:'module',source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};return next(url,context);}
 });
 try {const mod=await import(entry.href);return {mode:'real',intermediateToIfc:mod.intermediateToIfc,intermediateToScene:mod.intermediateToScene};}finally{hooks.deregister();}
}
export async function main(args=process.argv.slice(2),io={stdin:process.stdin,stdout:process.stdout,stderr:process.stderr},load=loadConverters){
 const emit=result=>{io.stdout.write(JSON.stringify(result)+'\n');if(result.error)io.stderr.write(result.error.message+'\n');return result.exitCode;};
 if(args.length===1&&args[0]==='--help'){io.stdout.write('利用方法: node src/bimExchange/harness/cli.mjs --input <JSONファイル|-> --output <新規フォルダ>\n');return 0;}
 const opts={};for(let i=0;i<args.length;i+=2){if(!['--input','--output'].includes(args[i])||!args[i+1]||opts[args[i]])return emit({exitCode:2,error:{code:'USAGE',message:'--input と --output を一度ずつ指定してください'}});opts[args[i]]=args[i+1];}
 if(!opts['--input']||!opts['--output'])return emit({exitCode:2,error:{code:'USAGE',message:'入力と出力先が必要です'}});
 let model;try{let text;if(opts['--input']==='-'){const chunks=[];for await(const chunk of io.stdin)chunks.push(Buffer.from(chunk));text=Buffer.concat(chunks).toString('utf8');}else text=await readFile(opts['--input'],'utf8');model=JSON.parse(text.replace(/^\uFEFF/,''));}catch(e){return emit({exitCode:3,error:{code:'INPUT_READ',message:e.message}});}
 const issues=validateModel(model);if(issues.length)return emit({exitCode:3,error:{code:'INVALID_INPUT',message:'入力検証失敗'},issues});
 let converters;try{converters=await load();}catch(e){return emit({exitCode:4,error:{code:'CONVERTER_UNAVAILABLE',message:e.message}});}
 return emit(await runConversion({model,outputDir:opts['--output'],converters}));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)process.exitCode=await main();
