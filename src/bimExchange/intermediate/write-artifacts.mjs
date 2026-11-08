// Node 24: src内の相対TS依存を解決し、契約Schemaと架空fixtureを保存する。
import { registerHooks } from 'node:module'
import { writeFileSync } from 'node:fs'
import ts from 'typescript'
const base = new URL('./', import.meta.url)
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.startsWith(new URL('../../',base).href) && /^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`,context)
  return next(specifier,context)
}})
const { intermediateJsonSchema, snapshotJsonSchema, planToIntermediate, autoPlanToSnapshot } = await import('./index.ts')
const { sampleSnapshot, sampleFloorPlans, sampleHostedFloorPlans } = await import('./fixtures.ts')
const files = {
  'intermediate.schema.json': intermediateJsonSchema,
  'snapshot.schema.json': snapshotJsonSchema,
  'fixture.snapshot.json': sampleSnapshot(),
  'fixture.intermediate.json': planToIntermediate(sampleSnapshot()),
  'fixture.autoplan.intermediate.json': planToIntermediate(autoPlanToSnapshot(sampleFloorPlans())),
  'fixture.hosted.intermediate.json': planToIntermediate(autoPlanToSnapshot(sampleHostedFloorPlans())),
}
for (const [name,value] of Object.entries(files)) writeFileSync(new URL(name,base),JSON.stringify(value,null,2)+'\n')
const configPath=ts.findConfigFile(process.cwd(),ts.sys.fileExists,'tsconfig.json')
const config=ts.readConfigFile(configPath,ts.sys.readFile)
const parsed=ts.parseJsonConfigFileContent({...config.config,include:['src/bimExchange/intermediate/**/*.ts']},ts.sys,process.cwd())
const program=ts.createProgram(parsed.fileNames,{...parsed.options,noEmit:true,incremental:false})
const diagnostics=ts.getPreEmitDiagnostics(program).map(d=>({file:d.file?.fileName,code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')}))
const own=diagnostics.filter(d=>!d.file||d.file.replaceAll('\\','/').includes('/bimExchange/intermediate/'))
writeFileSync(new URL('typecheck-results.json',base),JSON.stringify({success:own.length===0,scope:'src/bimExchange/intermediate',diagnostics:own,dependencyDiagnostics:diagnostics.filter(d=>!own.includes(d))},null,2)+'\n')
if(own.length) { console.error(JSON.stringify(own));process.exitCode=1 }
