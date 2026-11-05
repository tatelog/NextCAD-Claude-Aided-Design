// 仕様（ハブ A-03 G99。統括の訂正 2026-11-04。前の「割り付けなし」の指示は取り消し）:
// 住戸の割り付けの単位は「柱列をまとめた単位」。隣り合う柱列を 1 本から順にまとめ、まとめた幅が 間口 × N（N は 1 以上の整数）になる
// 最小の範囲に、1 タイプを置く。N の戸に分ける（間口ずつ）。どの型も候補から外さず、割り付けなし（列が空く）は作らない。
// 仕様 1（まとめる）: 列幅 3000 が 2 本で 6000 なら、間口 6000 の型（1DK）が 1 戸。
// 仕様 2（列ごと）: 列幅 6000 が 2 本で 12000 なら、1DK が 2 戸（1 本ずつ、それぞれ 1 戸）。
// 仕様 3（N 戸）: 列幅 4000 が 3 本で 12000 なら、間口 6000 の型が 2 戸（6000 ずつ。2 本目は途中で区切る）。
// 仕様 4（最小の範囲）: 同じ列の並びでも、合う範囲のうち一番短いものを選ぶ。
// 仕様 5（型の順）: 同じ範囲に合う型が複数なら、型の並びで先の型。
// 仕様 6（余り・吸収）: 範囲に入らない余りの列は、未確認の型が無ければ、前の範囲の最後の住戸に含めて幅を広げる（要確認）。
//   前の範囲が無い（先頭の余り）は、次の範囲の最初の住戸に含める。
// 仕様 7（未確認・仮の間口）: 間口が未確認（null）の型は、余りの列に、列の幅を仮の間口として置く（要確認）。列ごとに型を順に繰り返す。
// 仕様 8（合わない型）: 範囲が一つも無いとき、列ごとに先頭の型を列の幅で仮置きする（要確認）。割り付けなしは作らない。
// 仕様 9（同じ入力）: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { groupByFrontage, typeIdsOfSpans } from './frontageBlocks'

const T1DK = { id: 'T-08-1DK', frontageMm: 6000 }
const UNKNOWN = { id: 'T-4LDK-2', frontageMm: null }

describe('まとめ方（仕様 1〜3）', () => {
  it('列幅 3000 が 2 本で 6000 なら、1DK が 1 戸（2 本をまとめた 1 住戸）', () => {
    const g = groupByFrontage([3000, 3000], [T1DK])
    expect(g.units).toEqual([
      { typeId: 'T-08-1DK', startMm: 0, widthMm: 6000, firstColumn: 0, lastColumn: 1, provisional: false, absorbed: false, group: 0 },
    ])
  })

  it('列幅 6000 が 2 本で 12000 なら、1DK が 2 戸（1 本ずつ、それぞれ 1 戸）', () => {
    const g = groupByFrontage([6000, 6000], [T1DK])
    expect(g.units.map((u) => [u.startMm, u.widthMm, u.group])).toEqual([
      [0, 6000, 0],
      [6000, 6000, 1],
    ])
  })

  it('列幅 4000 が 3 本で 12000 なら、間口 6000 の型が 2 戸。2 本目は 6000 の位置で区切る（N 戸）', () => {
    const g = groupByFrontage([4000, 4000, 4000], [T1DK])
    expect(g.units.map((u) => [u.startMm, u.widthMm, u.firstColumn, u.lastColumn, u.group])).toEqual([
      [0, 6000, 0, 1, 0],
      [6000, 6000, 1, 2, 0],
    ])
    expect(g.units.every((u) => !u.absorbed && !u.provisional)).toBe(true)
  })
})

describe('最小の範囲（仕様 4）', () => {
  it('列幅 3000 が 4 本なら、2 本ずつ 2 まとまり（それぞれ 1 戸）', () => {
    const g = groupByFrontage([3000, 3000, 3000, 3000], [T1DK])
    expect(g.units.map((u) => [u.startMm, u.widthMm, u.group])).toEqual([
      [0, 6000, 0],
      [6000, 6000, 1],
    ])
  })
})

describe('型の順（仕様 5）', () => {
  it('同じ範囲に合う型が複数なら、型の並びで先の型を置く', () => {
    const a = { id: 'T-A', frontageMm: 6000 }
    const b = { id: 'T-B', frontageMm: 6000 }
    expect(groupByFrontage([6000], [a, b]).units[0]?.typeId).toBe('T-A')
    expect(groupByFrontage([6000], [b, a]).units[0]?.typeId).toBe('T-B')
  })

  it('型の並びより、最小の範囲が先（12000 の型が後にあっても、6000 の 1 列は 1DK で割る）', () => {
    const big = { id: 'T-12000', frontageMm: 12000 }
    expect(groupByFrontage([6000, 6000], [big, T1DK]).units.map((u) => u.typeId)).toEqual(['T-08-1DK', 'T-08-1DK'])
  })
})

describe('余りの吸収（仕様 6）', () => {
  it('列幅 3000 が 3 本（6000 の型）なら、余りの 1 本は前の住戸に含めて幅を 9000 にする（1 戸のまま、要確認）', () => {
    const g = groupByFrontage([3000, 3000, 3000], [T1DK])
    expect(g.units).toEqual([
      { typeId: 'T-08-1DK', startMm: 0, widthMm: 9000, firstColumn: 0, lastColumn: 2, provisional: false, absorbed: true, group: 0 },
    ])
  })

  it('余りは、前の範囲の最後の住戸に入る（最初の住戸は 6000 のまま）', () => {
    const g = groupByFrontage([6000, 6000, 3000], [T1DK])
    expect(g.units.map((u) => [u.startMm, u.widthMm, u.absorbed])).toEqual([
      [0, 6000, false],
      [6000, 9000, true],
    ])
  })

  it('先頭の余りは、次の範囲の最初の住戸に入る', () => {
    const g = groupByFrontage([3000, 6000], [T1DK])
    expect(g.units).toEqual([
      { typeId: 'T-08-1DK', startMm: 0, widthMm: 9000, firstColumn: 0, lastColumn: 1, provisional: false, absorbed: true, group: 0 },
    ])
  })
})

describe('未確認の型（仕様 7）', () => {
  it('余りの列に、未確認の型を列の幅で仮置きする（要確認。候補からは外さない）', () => {
    const g = groupByFrontage([6000, 3000, 6000], [T1DK, UNKNOWN])
    expect(g.units).toEqual([
      { typeId: 'T-08-1DK', startMm: 0, widthMm: 6000, firstColumn: 0, lastColumn: 0, provisional: false, absorbed: false, group: 0 },
      { typeId: 'T-4LDK-2', startMm: 6000, widthMm: 3000, firstColumn: 1, lastColumn: 1, provisional: true, absorbed: false, group: 1 },
      { typeId: 'T-08-1DK', startMm: 9000, widthMm: 6000, firstColumn: 2, lastColumn: 2, provisional: false, absorbed: false, group: 2 },
    ])
  })

  it('未確認の型が複数なら、余りの列に順に繰り返して置く', () => {
    const u1 = { id: 'T-U1', frontageMm: null }
    const u2 = { id: 'T-U2', frontageMm: null }
    const g = groupByFrontage([3000, 3000, 3000], [u1, u2])
    expect(g.units.map((u) => [u.typeId, u.widthMm, u.provisional])).toEqual([
      ['T-U1', 3000, true],
      ['T-U2', 3000, true],
      ['T-U1', 3000, true],
    ])
  })

  it('未確認の型だけでも、どの列も置ける（列の幅で仮置き）', () => {
    const g = groupByFrontage([6000, 3500], [UNKNOWN])
    expect(g.units.map((u) => [u.typeId, u.startMm, u.widthMm, u.provisional])).toEqual([
      ['T-4LDK-2', 0, 6000, true],
      ['T-4LDK-2', 6000, 3500, true],
    ])
  })
})

describe('合わない型（仕様 8）', () => {
  it('範囲が一つも無いときは、列ごとに先頭の型を列の幅で仮置きする（割り付けなしは作らない）', () => {
    const g = groupByFrontage([3500, 3500], [T1DK])
    expect(g.units.map((u) => [u.typeId, u.startMm, u.widthMm, u.provisional, u.absorbed])).toEqual([
      ['T-08-1DK', 0, 3500, true, false],
      ['T-08-1DK', 3500, 3500, true, false],
    ])
  })

  it('型が一つも無ければ、住戸は作らない', () => {
    expect(groupByFrontage([3000, 3000], []).units).toEqual([])
  })
})

describe('同じ入力（仕様 9）と列ごとの型', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const spans = [3000, 3000, 6000]
    const before = JSON.stringify(spans)
    expect(groupByFrontage(spans, [T1DK])).toEqual(groupByFrontage(spans, [T1DK]))
    expect(JSON.stringify(spans)).toBe(before)
  })

  it('列ごとの型：余りを吸収した列も、その住戸の型を持つ（割り付けなしの列は無い）', () => {
    const g = groupByFrontage([3000, 3000, 3500], [T1DK])
    expect(typeIdsOfSpans(g)).toEqual(['T-08-1DK', 'T-08-1DK', 'T-08-1DK'])
  })
})
