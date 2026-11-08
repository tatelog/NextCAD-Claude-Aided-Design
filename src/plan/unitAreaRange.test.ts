import {writeFileSync} from 'node:fs'
import {expect,it} from 'vitest'
import {unitAreaRange,unitAreaAllowed,typesForArea} from './unitAreaRange'
it('承認済み全タイプの上下限',()=>{for(const [t,min,max] of [['1K',20,30],['1DK',25,40],['1LDK',35,55],['2LDK',50,70],['3LDK',65,90],['4LDK',80,110]] as const){expect(unitAreaRange(t)).toEqual({min,max});expect(unitAreaAllowed(t,min*1e6)).toBe(true);expect(unitAreaAllowed(t,max*1e6+100)).toBe(false)}})
it('70㎡は1LDKではなく2LDKと3LDK候補',()=>expect(typesForArea(70)).toEqual(['2LDK','3LDK']))

import {fitUnitAutomatically} from './automaticUnitFit'
import {readUnitPlan} from './unitPlan39'
import {validateUnitLayout} from './reshapeUnit'
it.each(['1K','1DK','1LDK','2LDK','3LDK','4LDK'])('%sの実データ候補は面積と室内条件の両方を満たすか理由付きで除外する',type=>{
 const id=`T-08-${type==='4LDK'?'4LDK-1':type}`
 const sources=['A','B','C'].flatMap(v=>{const p=readUnitPlan(id,v);return p?[p]:[]})
 expect(sources.length).toBeGreaterThan(0)
 const r=fitUnitAutomatically(sources,{maxFrontage:24000,maxDepth:6100})
 writeFileSync(`work/fit-${type}.json`,JSON.stringify(r,null,2))
 if(r.plan){for(const p of r.candidates??[r.plan]){expect(unitAreaAllowed(type,p.envelope.W*p.envelope.D)).toBe(true);expect(validateUnitLayout(p)).toEqual([])}}
 else expect(r.reasons.length).toBeGreaterThan(0)
},60000)
