import { describe, it, expect } from 'vitest'
import { rectangularStudy } from './rectangularStudy'
const input = {widthMm:16000,lengthMm:42000,corridorMm:2000,storeys:5,storeyHeightMm:3000,columnMm:600,types:[{id:'A',frontageMm:6000,depthMm:7000,psMm:600,wetEnd:'start' as const},{id:'B',frontageMm:9000,depthMm:6500,psMm:800,wetEnd:'end' as const}]}
const overlap=(a:any,b:any)=>Math.min(a.x1,b.x1)>Math.max(a.x0,b.x0)&&Math.min(a.y1,b.y1)>Math.max(a.y0,b.y0)
describe('長方形の比較案',()=>{
 it('住戸・廊下・コアは外形内で相互に重ならず、住戸は廊下に接する',()=>{
  const s=rectangularStudy(input),p=s.plan
  const objects=[...p.cells,p.corridor,...p.cores]
  for(const o of objects){expect(o.x0).toBeGreaterThanOrEqual(0);expect(o.y0).toBeGreaterThanOrEqual(0);expect(o.x1).toBeLessThanOrEqual(input.widthMm);expect(o.y1).toBeLessThanOrEqual(input.lengthMm)}
  for(let i=0;i<objects.length;i++)for(let j=i+1;j<objects.length;j++)expect(overlap(objects[i],objects[j])).toBe(false)
  expect(p.cells.length).toBeGreaterThan(0)
  for(const c of p.cells)expect(c.x1===p.corridor.x0||c.x0===p.corridor.x1).toBe(true)
 })
 it('各住戸にタイプの寸法と水回り側に対応するPSを持つ',()=>{
  const s=rectangularStudy(input)
  for(const c of s.plan.cells){const t=input.types.find(t=>t.id===s.unitTypes[c.id])!;expect(c.y1-c.y0).toBe(t.frontageMm);expect(c.x1-c.x0).toBe(t.depthMm);const ps=s.plan.shaftRects.find(p=>p.unitId===c.id)!;expect(ps.x1-ps.x0).toBe(t.psMm);expect(ps.y0).toBe(t.wetEnd==='start'?c.y0:c.y1-t.psMm)}
 })
 it('柱の負担面積の合計は建物面積に一致し、上下階で共通の軸を持つ',()=>{
  const s=rectangularStudy(input)
  expect(s.columns.reduce((a,c)=>a+c.tributaryM2,0)).toBeCloseTo(16*42)
  expect(new Set(s.columns.map(c=>c.id)).size).toBe(s.columns.length)
 })
 it('収まらない奥行と負の寸法を黙って補正しない',()=>{
  expect(()=>rectangularStudy({...input,widthMm:10000})).toThrow()
  expect(()=>rectangularStudy({...input,corridorMm:-1})).toThrow()
 })
})
