import {it,expect} from 'vitest'
import {fitUnitAutomatically} from './automaticUnitFit'
import type {UnitPlan39} from './unitPlan39'
const source:UnitPlan39={id:'x',type:'x',envelope:{W:4000,D:4000,balcony_depth:0},rooms:[{id:'r',name:'LDK',kind:'居室',x:0,y:0,w:4000,h:4000,area_m2:16}],doors:[{id:'d',kind:'引戸',width:900,position:{orientation:'h',coord:0,start:1500}}],fixtures:[],windows:[],columns:[]}
it('LDKの短辺を縮める自動変形は採用しない',()=>{const r=fitUnitAutomatically([source],{maxFrontage:6000,maxDepth:3200});expect(r.plan).toBeUndefined();expect(r.reasons).toContain('LDK・DKの面積または短辺が元の住戸案より小さくなります')})
it('短辺を保てる面積固定変形は採用する',()=>{const p={...source,envelope:{...source.envelope,W:3000,D:6000},rooms:[{...source.rooms[0]!,w:3000,h:6000,area_m2:18}]};const r=fitUnitAutomatically([p],{maxFrontage:6000,maxDepth:4500});expect(r.plan).toBeTruthy();expect(r.plan!.envelope.W*r.plan!.envelope.D).toBeCloseTo(18000000)})
it('面積が入らない枠は不採用で理由を残す',()=>{const r=fitUnitAutomatically([source],{maxFrontage:3000,maxDepth:3000});expect(r.plan).toBeUndefined();expect(r.reasons.length).toBeGreaterThan(0)})
it('家具閉塞のある案を無条件採用しない',()=>{const bad={...source,fixtures:[{id:'f',kind:'ベッド',x:0,y:0,w:4000,h:4000}]};expect(fitUnitAutomatically([bad],{maxFrontage:4000,maxDepth:4000}).plan).toBeUndefined()})

it('家具がなくても入口のない居室が残る案を自動配置しない',()=>{
 const isolated:UnitPlan39={...source,id:'isolated',rooms:[
  {...source.rooms[0]!,w:4000,h:2000,area_m2:8},
  {...source.rooms[0]!,id:'bedroom',name:'洋室',y:2000,w:4000,h:2000,area_m2:8}
 ]}
 const result=fitUnitAutomatically([isolated],{maxFrontage:4000,maxDepth:4000})
 expect(result.plan).toBeUndefined()
 expect(result.reasons.some(r=>r.includes('洋室')&&r.includes('玄関から通れない'))).toBe(true)
 // 同じ外形でも、内部開口があり通れる代替案なら採用できる。
 const connected:UnitPlan39={...isolated,id:'connected',doors:[...isolated.doors,{id:'internal',kind:'引戸',width:900,position:{orientation:'h',coord:2000,start:1500}}]}
 const alternative=fitUnitAutomatically([isolated,connected],{maxFrontage:4000,maxDepth:4000})
 expect(alternative.plan?.id).toBe('connected')
})

it('同面積なら最初の細長い成立案よりLDK短辺の広い候補を採る',()=>{
 const p={...source,envelope:{...source.envelope,W:3000,D:6000},rooms:[{...source.rooms[0]!,w:3000,h:6000,area_m2:18}]}
 const r=fitUnitAutomatically([p],{maxFrontage:6000,maxDepth:6000})
 expect(r.plan).toBeTruthy()
 expect(r.plan!.envelope.W*r.plan!.envelope.D).toBeCloseTo(18000000)
 expect(Math.min(r.plan!.rooms[0]!.w,r.plan!.rooms[0]!.h)).toBeGreaterThanOrEqual(4000)
})

it('室内条件を満たす別形状を外形との照合用に残す',()=>{
 const p={...source,envelope:{...source.envelope,W:3000,D:6000},rooms:[{...source.rooms[0]!,w:3000,h:6000,area_m2:18}]}
 const r=fitUnitAutomatically([p],{maxFrontage:6000,maxDepth:6000})
 expect(r.candidates?.[0]).toBe(r.plan)
 expect(new Set(r.candidates?.map(c=>c.envelope.W)).size).toBeGreaterThan(1)
 expect(r.candidates?.every(c=>Math.abs(c.envelope.W*c.envelope.D-18000000)<1)).toBe(true)
})
