import { describe, expect, it } from 'vitest'
import { detailLinesOfObjects, exteriorRow, slabObjectRow } from './estimateObjects'
import { detailLinesOfStructure, sourceOf } from './estimateDetail'
import { structureQuantities, REBAR_T_PER_M3 } from './structureQuantities'

// 仕様（ハブ A-03 G22・G86。統括の決定、BwC の指示 2026-11-04）から書いたテスト。
// - 明細の行は「出典」の欄を持つ。仮置きの値は「出典なし・仮置き（G22）」。
// - 鉄筋の係数は、公的に無償で確認できる出典が無いので「未確定（G22）: 出典なし・仮置き」。値は変えない（既定 0.1 t/m³）。
// - 仮置きでない（外形・部屋から計算する）数量は「計算（仮置きなし）」。

const SQUARE = [
  { x: 0, y: 0 },
  { x: 10_000, y: 0 },
  { x: 10_000, y: 10_000 },
  { x: 0, y: 10_000 },
]
const STOREYS = { storey_count: 3, storey_height: 3000 }

describe('明細の出典の欄（G22）', () => {
  it('鉄筋の係数は「未確定」と出典なしを示す', () => {
    expect(sourceOf('鉄筋（床版）', true)).toBe('未確定: 出典なし・仮置き')
  })

  it('仮置きの数量は「出典なし・仮置き」', () => {
    expect(sourceOf('コンクリート（床版）', true)).toBe('出典なし・仮置き')
  })

  it('仮置きでない数量は「計算（仮置きなし）」', () => {
    expect(sourceOf('屋根防水', false)).toBe('計算（仮置きなし）')
  })

  it('床版の明細の鉄筋の行は、出典の欄に未確定を持ち、値は従来の 0.1 t/m³ のまま', () => {
    const q = structureQuantities(SQUARE, STOREYS)
    const lines = detailLinesOfStructure('slab-1', q, { coverMm: 30, joint: '重ね継手' })
    const rebar = lines.find((l) => l.item === '鉄筋（床版）')!
    expect(rebar.source).toBe('未確定: 出典なし・仮置き')
    expect(rebar.quantity).toBeCloseTo(q.concrete.quantity * REBAR_T_PER_M3, 10)
  })

  it('オブジェクト表から出る明細の行は、すべて出典の欄を持つ（空ではない）', () => {
    const rows = [slabObjectRow(SQUARE, 3, 3000), exteriorRow(SQUARE, 3, 3000)]
    const lines = detailLinesOfObjects(rows, { coverMm: 30, joint: '重ね継手' })
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.every((l) => l.source.length > 0)).toBe(true)
  })

  it('屋根防水（仮置きでない）は「計算（仮置きなし）」', () => {
    const lines = detailLinesOfObjects([exteriorRow(SQUARE, 3, 3000)], { coverMm: 30, joint: '重ね継手' })
    expect(lines.find((l) => l.item === '屋根防水')!.source).toBe('計算（仮置きなし）')
  })
})
