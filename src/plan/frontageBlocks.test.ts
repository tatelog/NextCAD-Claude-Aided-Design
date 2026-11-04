// 仕様（ハブ A-03 G99。統括の依頼 t56、2026-11-04）: P3 の住戸の自動割付は、住戸タイプの間口（mm）の整数倍になる柱列をまとめた単位で割り付ける。
// 間口に合わない列の組み合わせは候補にしない。
// 仕様 1（候補）: 連続する柱列の幅の合計が、型の間口の整数倍なら、その型の候補になる（単位数は合計 ÷ 間口）。
// 仕様 2（候補にしない）: 合計が間口の整数倍でなければ候補にしない。間口が未確認（null）の型も候補にしない。
// 仕様 3（覆う）: 柱列の全部を、候補の単位だけで覆う割り付けを返す。覆えないときは null（黙って別の型で埋めない）。
// 仕様 4（少ない住戸）: 覆う割り付けのうち、住戸の数（幅 ÷ 間口の合計）が最も少ないものを返す。
//   住戸の数が同じなら、柱列のまとまりの数が少ないほう（まとめた単位を優先する。G99「柱列をまとめた単位」）。
// 仕様 5（同じ入力）: 同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { candidateBlocks, partitionByFrontage } from './frontageBlocks'

const TYPES = [
  { id: 'T-4500', frontageMm: 4500 },
  { id: 'T-6000', frontageMm: 6000 },
  { id: 'T-unknown', frontageMm: null },
]

describe('候補（仕様 1・2）', () => {
  it('連続する柱列の幅の合計が間口の整数倍なら候補（3 列 18000 mm は間口 4500 の 4 単位）', () => {
    const c = candidateBlocks([6000, 6000, 6000], TYPES)
    expect(c).toContainEqual({ start: 0, count: 3, typeId: 'T-4500', units: 4 })
  })

  it('整数倍でない列の組み合わせは候補にしない（2 列 12000 mm は間口 4500 に合わない）', () => {
    const c = candidateBlocks([6000, 6000], [{ id: 'T-4500', frontageMm: 4500 }])
    expect(c.some((x) => x.count === 2)).toBe(false)
  })

  it('間口が未確認（null）の型は候補にしない', () => {
    const c = candidateBlocks([6000], TYPES)
    expect(c.some((x) => x.typeId === 'T-unknown')).toBe(false)
  })
})

describe('覆う割り付け（仕様 3）', () => {
  it('候補の単位だけで柱列を覆えば、その割り付けを返す（住戸 2 の同じ数なら、まとめた 1 単位を優先）', () => {
    const p = partitionByFrontage([6000, 6000], [{ id: 'T-6000', frontageMm: 6000 }])
    expect(p).toEqual([{ start: 0, count: 2, typeId: 'T-6000', units: 2 }])
  })

  it('覆えないときは null（黙って別の型で埋めない）', () => {
    expect(partitionByFrontage([6000, 6000], [{ id: 'T-4500', frontageMm: 4500 }])).toBeNull()
  })
})

describe('少ない単位（仕様 4）', () => {
  it('住戸の数が最も少ない割り付けを返す（12000 の型は 4 列を 2 住戸で覆い、6000 の型の 4 住戸より少ない）', () => {
    const types = [
      { id: 'T-6000', frontageMm: 6000 },
      { id: 'T-12000', frontageMm: 12000 },
    ]
    const p = partitionByFrontage([6000, 6000, 6000, 6000], types)
    expect(p).toEqual([{ start: 0, count: 4, typeId: 'T-12000', units: 2 }])
  })
})

describe('同じ入力（仕様 5）', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const spans = [6000, 6000, 6000]
    const before = JSON.stringify(spans)
    expect(partitionByFrontage(spans, TYPES)).toEqual(partitionByFrontage(spans, TYPES))
    expect(JSON.stringify(spans)).toBe(before)
  })
})
