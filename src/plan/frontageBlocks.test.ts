// 仕様（ハブ A-03 G99。統括の依頼 t56、2026-11-04。統括の補足 2026-11-04 で置き換え）:
// 住戸の割り付けの単位は「柱列をまとめた単位」。隣り合う柱列を 1 本から順にまとめ、まとめた幅が 間口 × N（N は 1 以上の整数）になる
// 最小の範囲に、1 タイプを置く。N が住戸の数（戸）。幅が合わない列は「割り付けなし（間口と合わない）」。
// 仕様 1（まとめる）: 列幅 3000 が 2 本で 6000 なら、間口 6000 の型（1DK）が 1 戸。
// 仕様 2（列ごと）: 列幅 6000 が 2 本で 12000 なら、1DK が 2 戸（1 本ずつ、それぞれ 1 戸）。
// 仕様 3（割り付けなし）: 列幅 3500 は、どの型の間口の整数倍にもならないので、割り付けなし。
// 仕様 4（最小の範囲）: 同じ列の並びでも、合う範囲のうち一番短いものを選ぶ。
// 仕様 5（型の順）: 同じ範囲に合う型が複数なら、型の並びで先の型。
// 仕様 6（未確認）: 間口が未確認（null）の型は、どの範囲にも使わない。
// 仕様 7（同じ入力）: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { groupByFrontage, typeIdsOfSpans } from './frontageBlocks'

const T1DK = { id: 'T-08-1DK', frontageMm: 6000 }

describe('まとめ方（仕様 1〜3）', () => {
  it('列幅 3000 が 2 本で 6000 なら、1DK が 1 戸（2 本をまとめた 1 単位）', () => {
    expect(groupByFrontage([3000, 3000], [T1DK])).toEqual({
      blocks: [{ start: 0, count: 2, typeId: 'T-08-1DK', units: 1 }],
      unallocated: [],
    })
  })

  it('列幅 6000 が 2 本で 12000 なら、1DK が 2 戸（1 本ずつ、それぞれ 1 戸）', () => {
    const g = groupByFrontage([6000, 6000], [T1DK])
    expect(g.blocks).toEqual([
      { start: 0, count: 1, typeId: 'T-08-1DK', units: 1 },
      { start: 1, count: 1, typeId: 'T-08-1DK', units: 1 },
    ])
    expect(g.blocks.reduce((sum, b) => sum + b.units, 0)).toBe(2)
  })

  it('列幅 3500 は、どの型の間口の整数倍にもならないので、割り付けなし', () => {
    expect(groupByFrontage([3500], [T1DK])).toEqual({ blocks: [], unallocated: [0] })
  })
})

describe('最小の範囲（仕様 4）', () => {
  it('列幅 3000 が 4 本なら、2 本ずつ 2 まとまり（それぞれ 1 戸）', () => {
    const g = groupByFrontage([3000, 3000, 3000, 3000], [T1DK])
    expect(g.blocks).toEqual([
      { start: 0, count: 2, typeId: 'T-08-1DK', units: 1 },
      { start: 2, count: 2, typeId: 'T-08-1DK', units: 1 },
    ])
  })

  it('合わない列が混じると、その列は割り付けなし（前後の合う列はまとめ直す）', () => {
    expect(groupByFrontage([3000, 3500, 3000], [T1DK])).toEqual({ blocks: [], unallocated: [0, 1, 2] })
  })
})

describe('型の順（仕様 5）', () => {
  it('同じ範囲に合う型が複数なら、型の並びで先の型を置く', () => {
    const a = { id: 'T-A', frontageMm: 6000 }
    const b = { id: 'T-B', frontageMm: 6000 }
    expect(groupByFrontage([6000], [a, b]).blocks).toEqual([{ start: 0, count: 1, typeId: 'T-A', units: 1 }])
    expect(groupByFrontage([6000], [b, a]).blocks).toEqual([{ start: 0, count: 1, typeId: 'T-B', units: 1 }])
  })

  it('型の並びより、最小の範囲が先（12000 の型が後にあっても、6000 の 1 列は 1DK で割る）', () => {
    const big = { id: 'T-12000', frontageMm: 12000 }
    expect(groupByFrontage([6000, 6000], [big, T1DK]).blocks).toEqual([
      { start: 0, count: 1, typeId: 'T-08-1DK', units: 1 },
      { start: 1, count: 1, typeId: 'T-08-1DK', units: 1 },
    ])
  })
})

describe('未確認（仕様 6）', () => {
  it('間口が未確認（null）の型は、どの範囲にも使わない', () => {
    expect(groupByFrontage([6000], [{ id: 'T-unknown', frontageMm: null }])).toEqual({ blocks: [], unallocated: [0] })
  })
})

describe('同じ入力（仕様 7）と列ごとの型', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const spans = [3000, 3000, 6000]
    const before = JSON.stringify(spans)
    expect(groupByFrontage(spans, [T1DK])).toEqual(groupByFrontage(spans, [T1DK]))
    expect(JSON.stringify(spans)).toBe(before)
  })

  it('列ごとの型：まとまりの型を、その範囲の各列に置き、割り付けなしの列は null', () => {
    const spans = [3000, 3000, 3500]
    const g = groupByFrontage(spans, [T1DK])
    expect(typeIdsOfSpans(g, spans.length)).toEqual(['T-08-1DK', 'T-08-1DK', null])
  })
})
