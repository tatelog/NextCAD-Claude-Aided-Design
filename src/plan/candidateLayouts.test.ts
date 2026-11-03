// 仕様: 廊下タイプ（P3 の区画の作り方、仮置き）。片廊下・中廊下（既存）に、階段室型とツインコリドーを加える。
// 仕様 1: 階段室型は、中廊下と同じ区画の数で、中央の通路を「階段室（hall）」として返す。各住戸は階段室に面する。
// 仕様 2: ツインコリドーは、建物の両端に廊下（2 本）、真ん中に住戸を 1 スパン 1 戸。住戸は両方の廊下に面する。
// 仕様 3: ツインコリドーでも、区画は廊下と重ならない。
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

  it('ツインコリドーは両端に廊下 2 本、住戸は 1 スパン 1 戸で両方の廊下に面する', () => {
    const r = candidateCells({ ...common, width_mm: 2_000 * 2 + 6_000, layout: 'ツイン' })
    expect(r.corridors).toHaveLength(2)
    expect(r.cells).toHaveLength(12_000 / 3_000)
    for (const cell of r.cells) {
      expect(cell.x0).toBe(2_000)
      expect(cell.x1).toBe(8_000)
    }
  })

  it('ツインコリドーの区画は、どの廊下とも重ならない', () => {
    const r = candidateCells({ ...common, width_mm: 10_000, layout: 'ツイン' })
    for (const cell of r.cells) for (const c of r.corridors) expect(overlap(cell, c)).toBe(false)
  })

  it('中廊下・片廊下の返り値も corridors（1 本）を持つ', () => {
    expect(candidateCells({ ...common, layout: '中廊下' }).corridors).toHaveLength(1)
    expect(candidateCells({ ...common, width_mm: 8_000, layout: '片廊下' }).corridors).toHaveLength(1)
  })
})
