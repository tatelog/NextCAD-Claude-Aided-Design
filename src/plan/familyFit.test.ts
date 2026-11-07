import {it,expect} from 'vitest'
import {readUnitPlan} from './unitPlan39'
import {reshapeUnit} from './reshapeUnit'
it('2LDKの家具を再配置し、水回り寸法と入口を保って採用できる',()=>{
 const p=readUnitPlan('T-08-2LDK','B')!
 const r=reshapeUnit(p,p.envelope.W)
 expect(r.valid,r.issues.map(i=>i.message).join('\n')).toBe(true)
 expect(r.plan.fixtures).toHaveLength(p.fixtures.length)
 for(const room of p.rooms.filter(r=>r.kind==='水回り')){const actual=r.plan.rooms.find(r=>r.id===room.id)!;expect(actual.w).toBeCloseTo(room.w);expect(actual.h).toBeCloseTo(room.h)}
})
