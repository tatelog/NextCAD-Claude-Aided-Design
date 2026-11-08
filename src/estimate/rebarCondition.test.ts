import { describe, expect, it } from 'vitest'
import { REBAR_T_PER_M3, structureQuantities } from './structureQuantities'
import { rebarTPerM3 } from './rebarCondition'

// 仕様（ハブ A-03 G86。統括の決定 2026-11-04、A-03 版 48）から書いたテスト。
// - 躯体の鉄筋（t）は、面積あたりの仮置き係数で始める。鉄筋の被り厚と、重ね継手かカプラーかは、仮の条件として入力に置き、それで数量が変わる形にする。
// - 既定の条件（被り厚 30 mm・重ね継手）は、従来の鉄筋の量（REBAR_T_PER_M3 = 0.1 t/m³）と同じにする。
// - 係数は仮置き（出典が無い）。印は provisional のまま。

const SQUARE_10M = [
  { x: 0, y: 0 },
  { x: 10_000, y: 0 },
  { x: 10_000, y: 10_000 },
  { x: 0, y: 10_000 },
]
const STOREYS = { storey_count: 3, storey_height: 3000 }

describe('鉄筋の量の条件（被り厚・継手）', () => {
  it('既定（被り厚 30 mm・重ね継手）は、従来の 0.1 t/m³ と同じ', () => {
    expect(rebarTPerM3({ coverMm: 30, joint: '重ね継手' })).toBeCloseTo(REBAR_T_PER_M3, 10)
  })

  it('被り厚が変わると、鉄筋の量が変わる（30 mm より 50 mm のほうが多い）', () => {
    const c30 = rebarTPerM3({ coverMm: 30, joint: '重ね継手' })
    const c50 = rebarTPerM3({ coverMm: 50, joint: '重ね継手' })
    expect(c50).toBeGreaterThan(c30)
  })

  it('継手がカプラーだと、重ね継手と鉄筋の量が変わる', () => {
    const lap = rebarTPerM3({ coverMm: 30, joint: '重ね継手' })
    const coupler = rebarTPerM3({ coverMm: 30, joint: 'カプラー' })
    expect(coupler).not.toBe(lap)
  })

  it('躯体の数量の鉄筋だけが、被り厚と継手で変わる（床版・型枠・コンクリートは変わらない）', () => {
    const base = structureQuantities(SQUARE_10M, STOREYS)
    const changed = structureQuantities(SQUARE_10M, STOREYS, undefined, { coverMm: 50, joint: 'カプラー' })
    expect(changed.slab.quantity).toBe(base.slab.quantity)
    expect(changed.formwork.quantity).toBe(base.formwork.quantity)
    expect(changed.concrete.quantity).toBe(base.concrete.quantity)
    expect(changed.rebar.quantity).not.toBe(base.rebar.quantity)
  })

  it('既定の条件で、鉄筋の量は従来の値（コンクリートの体積 × 0.1 t/m³）と同じ', () => {
    const q = structureQuantities(SQUARE_10M, STOREYS)
    expect(q.rebar.quantity).toBeCloseTo(q.concrete.quantity * REBAR_T_PER_M3, 10)
  })

  it('係数は仮置きなので、印（provisional）は立ったまま', () => {
    const q = structureQuantities(SQUARE_10M, STOREYS, undefined, { coverMm: 40, joint: 'カプラー' })
    expect(q.rebar.provisional).toBe(true)
  })
})
