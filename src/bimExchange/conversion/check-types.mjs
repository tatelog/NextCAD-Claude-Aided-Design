import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const dir='src/bimExchange/conversion/';
const r=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','-p',dir+'tsconfig.json','--noEmit','--pretty','false'],{encoding:'utf8'});
const result={exitCode:r.status,diagnostics:(r.stdout+r.stderr).split(/\r?\n/).filter(Boolean)};
fs.writeFileSync(dir+'typecheck-scoped.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exitCode=r.status??1;
