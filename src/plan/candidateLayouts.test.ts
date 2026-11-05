// 仕様: 廊下タイプ（P3 の区画の作り方、仮置き）。片廊下・中廊下（既存）に、階段室型とツインコリドーを加える。
// 仕様 1: 階段室型は、中廊下と同じ区画の数で、中央の通路を「階段室（hall）」として返す。各住戸は階段室に面する。
// 仕様 2（統括の決定 G106、2026-11-05）: ツインコリドーは中廊下の変形。廊下の帯は通常の 3 倍（幅 = 廊下幅 × 3）で、
//   廊下 : 吹き抜け : 廊下 = 1 : 1 : 1。中央の 1 本分は天井のない吹き抜け（区画でも廊下でもない）。両側の 2 本が廊下で、住戸は帯の両側に 1 スパン 2 戸（中廊下と同じ）。
//   建物の幅 = 住戸の奥行 × 2 + 廊下幅 × 3。
// 仕様 3: ツインコリドーでも、区画は廊下・吹き抜けと重ならない。
// 仕様 4: 返り値は corridors（すべての廊下）を持つ。既存の corridor は主の廊下（1 本目）。
import { describe, expect, it } from 'vitest'
import { candidateCells } from './candidateCells'

const common = { width_mm: 14_000, depth_mm: 12_000, corridor_mm: 2_000, unit_depth_mm: 6_000, span_mm: 3_000 }

function overlap(a: { x0: number; y0: number; x1: number; y1: number }, b: { x0: number; y0: number; x1: number; y1: number }) {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
}

describe('廊下タイプ（区画）', () => {
  it('階段室型は中廊下と同じ区画の数。中央は hall', () => {
    const mid = candidateCells({ ...common, layout: '中廊下' })
    const hall = candidateCells({ ...common, layout: '階段室' })
    expect(hall.cells).toHaveLength(mid.cells.length)
    expect(hall.corridor.id).toBe('hall')
  })

  // 住戸の奥行 6000、廊下幅 2000 → 建物の幅 = 6000 × 2 + 2000 × 3 = 18000。深さ 12000 は 4 スパン（3000）
  const twinW = 6_000 * 2 + 2_000 * 3

  it('ツインコリドーは廊下 2 本と吹き抜け 1 つ。廊下の帯は 3 倍で、廊下 : 吹き抜け : 廊下 = 1 : 1 : 1（G106）', () => {
    const r = candidateCells({ ...common, width_mm: twinW, layout: 'ツイン' })
    expect(r.corridors).toHaveLength(2)
    expect(r.corridors[0]).toMatchObject({ x0: 6_000, x1: 8_000 })
    expect(r.corridors[1]).toMatchObject({ x0: 10_000, x1: 12_000 })
    expect(r.voids).toHaveLength(1)
    expect(r.voids[0]).toMatchObject({ x0: 8_000, x1: 10_000 })
  })

  it('ツインコリドーの住戸は帯の両側に 1 スパン 2 戸（中廊下と同じ）。両側の廊下に面する', () => {
    const r = candidateCells({ ...common, width_mm: twinW, layout: 'ツイン' })
    expect(r.cells).toHaveLength(2 * (12_000 / 3_000))
    expect(r.cells.filter((c) => c.x0 === 0 && c.x1 === 6_000)).toHaveLength(12_000 / 3_000)
    expect(r.cells.filter((c) => c.x0 === 12_000 && c.x1 === twinW)).toHaveLength(12_000 / 3_000)
  })

  it('ツインコリドーの区画は、どの廊下・吹き抜けとも重ならない', () => {
    const r = candidateCells({ ...common, width_mm: twinW, layout: 'ツイン' })
    for (const cell of r.cells) {
      for (const c of r.corridors) expect(overlap(cell, c)).toBe(false)
      for (const v of r.voids) expect(overlap(cell, v)).toBe(false)
    }
  })

  it('ツインコリドーの建物の幅が「奥行 × 2 + 廊下 × 3」に合わなければ、例外', () => {
    expect(() => candidateCells({ ...common, width_mm: 14_000, layout: 'ツイン' })).toThrow()
  })

  it('中廊下・片廊下の返り値も corridors（1 本）を持つ', () => {
    expect(candidateCells({ ...common, layout: '中廊下' }).corridors).toHaveLength(1)
    expect(candidateCells({ ...common, width_mm: 8_000, layout: '片廊下' }).corridors).toHaveLength(1)
  })
})
