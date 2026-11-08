import {unitAreaAllowed} from './unitAreaRange'
import {expect,it} from 'vitest'
import {readUnitPlan} from './unitPlan39'
import {recomposeUnit} from './recomposeUnit'
import {validateUnitLayout} from './reshapeUnit'

it.each(['3LDK','4LDK'])('%sを奥行6100の中で家具を縮めず部屋割りから再構成する',type=>{
 const source=readUnitPlan(`T-08-${type==='4LDK'?'4LDK-1':type}`)!
 const result=recomposeUnit(source,{maxFrontage:24000,maxDepth:6100})
 expect(result.plan,result.reasons.join('\n')).toBeDefined()
 const p=result.plan!
 expect(p.envelope.D).toBeLessThanOrEqual(6100)
 expect(p.envelope.W).toBeLessThanOrEqual(24000)
 expect(unitAreaAllowed(type,p.envelope.W*p.envelope.D)).toBe(true)
 expect(p.rooms.filter(r=>r.name.startsWith('洋室'))).toHaveLength(Number(type[0]))
 expect(p.fixtures.map(f=>f.id).sort()).toEqual(source.fixtures.map(f=>f.id).sort())
 for(const f of p.fixtures){const original=source.fixtures.find(o=>o.id===f.id)!;expect(f.w*f.h).toBe(original.w*original.h)}
 for(const old of source.rooms.filter(r=>r.kind==='水回り')){const room=p.rooms.find(r=>r.id===old.id)!;expect(room.w).toBeGreaterThanOrEqual(old.w);expect(room.h).toBeGreaterThanOrEqual(old.h)}
 expect(validateUnitLayout(p)).toEqual([])
},60000)

it('外形が不足する場合は部屋や家具を省略して採用しない',()=>{
 const result=recomposeUnit(readUnitPlan('T-08-3LDK')!,{maxFrontage:3000,maxDepth:6100})
 expect(result.plan).toBeUndefined()
 expect(result.reasons.length).toBeGreaterThan(0)
})

// 面積上限と家具実寸が両立しない候補を、従来の過大面積のまま採用しない。
it.each(['1LDK','2LDK'])('%sの既存家具構成が面積上限を超える場合は理由付きで不採用',type=>{
 const r=recomposeUnit(readUnitPlan(`T-08-${type}`)!,{maxFrontage:24000,maxDepth:6100})
 expect(r.plan).toBeUndefined()
 expect(r.reasons.some(x=>x.includes('住戸区画面積'))).toBe(true)
})
