import { describe, expect, it } from 'vitest'
import { detailLinesOfStructure } from './estimateDetail'
import { structureQuantities } from './structureQuantities'

// 仕様（ハブ A-03 G86。統括の決定 2026-11-04）から書いたテスト。
// - 積算はオブジェクト表から集計する。オブジェクト 1 件を、見積の明細（品目・数量・単位・単価の参照）に分解する。
// - 明細は、見積（P4）の正本になる行。単価の参照は、単価の表（T-10）が決まるまで null（未参照）。
// - 明細の行は、どのオブジェクトから出たか（objectId）と、条件（基礎になる仮置き）を持つ。印（provisional）は仮置きのまま。
// - 鉄筋の行は、被り厚と継手の条件を基礎に書く（数量が条件で変わる）。

const SQUARE_10M = [
  { x: 0, y: 0 },
  { x: 10_000, y: 0 },
  { x: 10_000, y: 10_000 },
  { x: 0, y: 10_000 },
]
const STOREYS = { storey_count: 3, storey_height: 3000 }

describe('躯体のオブジェクトを見積の明細に分ける', () => {
  it('躯体 1 件から、床版・型枠・コンクリート・鉄筋の 4 行ができる', () => {
    const q = structureQuantities(SQUARE_10M, STOREYS)
    const lines = detailLinesOfStructure('slab-1', q, { coverMm: 30, joint: '重ね継手' })
    expect(lines.map((l) => l.item)).toEqual(['床版（スラブ）', '型枠（床版の下面）', 'コンクリート（床版）', '鉄筋（床版）'])
  })

  it('各行は、元のオブジェクトの id と区分（躯体）を持つ', () => {
    const q = structureQuantities(SQUARE_10M, STOREYS)
    const lines = detailLinesOfStructure('slab-1', q, { coverMm: 30, joint: '重ね継手' })
    for (const l of lines) {
      expect(l.objectId).toBe('slab-1')
      expect(l.category).toBe('躯体')
    }
  })

  it('数量と単位は、元の数量（躯体の数量）と同じ', () => {
    const q = structureQuantities(SQUARE_10M, STOREYS)
    const lines = detailLinesOfStructure('slab-1', q, { coverMm: 30, joint: '重ね継手' })
    expect(lines.find((l) => l.item === '鉄筋（床版）')).toMatchObject({ quantity: q.rebar.quantity, unit: 't' })
    expect(lines.find((l) => l.item === '床版（スラブ）')).toMatchObject({ quantity: q.slab.quantity, unit: 'm2' })
  })

  it('単価の参照は、まだ決まっていないので null（未参照）', () => {
    const q = structureQuantities(SQUARE_10M, STOREYS)
    const lines = detailLinesOfStructure('slab-1', q, { coverMm: 30, joint: '重ね継手' })
    expect(lines.every((l) => l.unitPriceRef === null)).toBe(true)
  })

  it('印（provisional）は立ったまま。鉄筋の行の基礎は、被り厚と継手の条件を示す', () => {
    const q = structureQuantities(SQUARE_10M, STOREYS)
    const lines = detailLinesOfStructure('slab-1', q, { coverMm: 50, joint: 'カプラー' })
    expect(lines.every((l) => l.provisional)).toBe(true)
    expect(lines.find((l) => l.item === '鉄筋（床版）')!.basis).toContain('被り厚 50 mm・カプラー')
  })

  it('同じ入力からは同じ明細が出る（決定論）。行の id は オブジェクト id と品目から決まる', () => {
    const q = structureQuantities(SQUARE_10M, STOREYS)
    const a = detailLinesOfStructure('slab-1', q, { coverMm: 30, joint: '重ね継手' })
    const b = detailLinesOfStructure('slab-1', q, { coverMm: 30, joint: '重ね継手' })
    expect(a).toEqual(b)
    expect(new Set(a.map((l) => l.lineId)).size).toBe(4)
  })
})
