// 仕様: P3 柱割り（D-02 C6「等間隔の割り付け」「無理な通りの判定」は仮置き、A-03 G5・G17）。
// 仕様 1（等間隔）: 既定のスパン s で等間隔に割る。区間長 L に対して、区間の数は floor(L ÷ s)。
// 仕様 2（余り）: 余り r = L − 区間数 × s は、両端に半分ずつ寄せる（通りの外側の余白にする。残りの扱いは仮置き）。
//   通り芯の位置は、端から r/2 + k × s（k = 0..区間数）。
// 仕様 3（無理な通り）: スパンが許容範囲（最小・最大）の外なら「無理」。許容範囲は呼び出し側が渡す（数値は未決）。
// 仕様 4: スパン s が区間長 L より大きい（区間数 0）なら弾く。s と L は正の数。
import { describe, expect, it } from 'vitest'
import { gridLines, checkSpan } from './grid'

describe('gridLines（等間隔の通り）', () => {
  it('余りを両端に半分ずつ寄せて、通りを等間隔に置く', () => {
    // L = 10 m、s = 3 m → 3 区間、余り 1 m → 端から 0.5 m
    expect(gridLines(10_000, 3_000)).toEqual([500, 3_500, 6_500, 9_500])
  })

  it('余りが 0 なら端から通りを置く', () => {
    expect(gridLines(9_000, 3_000)).toEqual([0, 3_000, 6_000, 9_000])
  })

  it('スパンが区間長より大きければ弾く', () => {
    expect(() => gridLines(2_000, 3_000)).toThrow()
  })

  it('長さ・スパンが 0 以下なら弾く', () => {
    expect(() => gridLines(0, 3_000)).toThrow()
    expect(() => gridLines(9_000, 0)).toThrow()
  })
})

describe('checkSpan（無理な通りの判定）', () => {
  const range = { minMm: 5_400, maxMm: 7_200 }

  it('許容範囲の中なら ok', () => {
    expect(checkSpan(6_300, range)).toBe('ok')
  })

  it('許容範囲の外なら無理', () => {
    expect(checkSpan(4_000, range)).toBe('無理')
    expect(checkSpan(8_000, range)).toBe('無理')
  })
})
