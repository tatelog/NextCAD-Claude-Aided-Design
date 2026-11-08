import { describe, expect, it } from 'vitest'
import { planToIntermediate, validateIntermediate, intermediateJsonSchema, autoPlanToSnapshot } from './index'
import { sampleSnapshot, sampleFloorPlans } from './fixtures'

describe('中間モデルの共通契約', () => {
  it('絶対高さ・元ID・概算状態を保持し入力を書き換えない', () => {
    const input = sampleSnapshot()
    const before = JSON.stringify(input)
    const model = planToIntermediate(input)
    expect(model.schemaVersion).toBe('bim-intermediate/1')
    expect(model.elements[0]!.geometry!.zMm).toBe(3200)
    expect(model.elements[0]!.status).toBe('estimated')
    expect(model.elements[0]!.source.elementIds).toContain('wall-source')
    expect(JSON.stringify(input)).toBe(before)
    model.elements[0]!.geometry!.outer[0]!.x = 999
    expect(JSON.stringify(input)).toBe(before)
  })
  it('未確定断面はnullとし確定扱いにしない', () => {
    const model = planToIntermediate(sampleSnapshot())
    expect(model.elements[1]!.geometry).toBeNull()
    expect(model.elements[1]!.status).toBe('unresolved')
    expect(model.issues.some(i => i.elementId === model.elements[1]!.id)).toBe(true)
  })
  it('概算由来の確定指定を昇格させず、確認済み入力は保持する', () => {
    const input=sampleSnapshot()
    input.elements[0]!.status='confirmed'
    expect(planToIntermediate(input).elements[0]!.status).toBe('estimated')
    input.elements[0]!.source.origin='user'
    expect(planToIntermediate(input).elements[0]!.status).toBe('confirmed')
  })
  it('終点重複を除去し穴を保持する', () => {
    const input = sampleSnapshot()
    input.elements[0]!.footprint!.outer.push({ ...input.elements[0]!.footprint!.outer[0]! })
    const model = planToIntermediate(input)
    expect(model.elements[0]!.geometry!.outer).toHaveLength(4)
    expect(model.elements[0]!.geometry!.holes).toHaveLength(1)
    expect(validateIntermediate(model)).toEqual([])
    expect(intermediateJsonSchema).toHaveProperty('$schema')
  })
  it('不正な階参照・ID重複・非有限数を拒否する', () => {
    const input = sampleSnapshot()
    input.elements[0]!.storeyId = 'missing'
    expect(() => planToIntermediate(input)).toThrow()
    const duplicate = sampleSnapshot()
    duplicate.elements.push(structuredClone(duplicate.elements[0]!))
    expect(() => planToIntermediate(duplicate)).toThrow()
    const invalid = sampleSnapshot()
    invalid.storeys[0]!.heightMm = NaN
    expect(() => planToIntermediate(invalid)).toThrow()
  })
  it('自己交差・外部の穴を無効形状として保持する', () => {
    const input = sampleSnapshot()
    input.elements[0]!.footprint!.outer = [{x:0,y:0},{x:100,y:100},{x:0,y:100},{x:100,y:0}]
    expect(planToIntermediate(input).elements[0]!.geometry).toBeNull()
    const hole = sampleSnapshot()
    hole.elements[0]!.footprint!.holes = [[{x:9000,y:0},{x:9010,y:0},{x:9010,y:10}]]
    expect(planToIntermediate(hole).elements[0]!.geometry).toBeNull()
  })
  it('外部JSONの不正状態と重複参照も検証する', () => {
    const model = planToIntermediate(sampleSnapshot())
    model.elements[1]!.status = 'confirmed'
    model.elements[0]!.storeyId = 'missing'
    expect(validateIntermediate(model).length).toBeGreaterThan(0)
    expect(validateIntermediate({} ).length).toBeGreaterThan(0)
  })
})

describe('既存平面のadapter', () => {
  it('指定階だけ変換し床版とバルコニーの重複・吹抜けを除外する', () => {
    const input = sampleFloorPlans()
    const before = JSON.stringify(input)
    const model = planToIntermediate(autoPlanToSnapshot(input))
    expect(model.storeys.map(s => s.id)).toEqual(['floor-2'])
    const solids = model.elements.filter(e => e.kind === 'slab' || e.kind === 'balcony')
    const area = (ring: {x:number;y:number}[]) => Math.abs(ring.reduce((v,p,i) => { const q=ring[(i+1)%ring.length]!; return v+p.x*q.y-q.x*p.y },0)/2)
    expect(solids.reduce((v,e) => v + (e.geometry ? area(e.geometry.outer)-e.geometry.holes.reduce((a,h)=>a+area(h),0) : 0),0)).toBe(12000000 - 1000000)
    expect(solids.every(e => e.geometry?.heightMm === 200)).toBe(true)
    expect(solids.every(e => e.geometry?.zMm === 3000)).toBe(true)
    expect(model.elements.some(e => e.source.elementIds.includes('balcony-original'))).toBe(true)
    expect(model.elements.some(e => e.source.elementIds.includes('void-original'))).toBe(true)
    expect(model.elements.some(e => e.kind === 'opening' && e.geometry === null)).toBe(true)
    expect(model.elements.some(e => e.kind === 'column' && e.status === 'unresolved')).toBe(true)
    expect(JSON.stringify(input)).toBe(before)
    expect(validateIntermediate(model)).toEqual([])
  })
  it('階情報の不足を暗黙補完しない', () => {
    const input = sampleFloorPlans()
    input.storeys = []
    expect(() => autoPlanToSnapshot(input)).toThrow()
  })
  it('負の矩形寸法を反転して有効扱いにしない', () => {
    const input=sampleFloorPlans()
    input.plans[2]!.balconies![0]!.x1=1000
    expect(()=>autoPlanToSnapshot(input)).toThrow()
  })
})
