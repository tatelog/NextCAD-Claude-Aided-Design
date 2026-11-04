// 仕様（ハブ A-03 G11「練習セットの作り方」・G10「二段閾値」の素材）: 描いた線を、正解の線と照合する。
// 再現率（正解のうち描けた割合）と適合率（描いた線のうち正解に当たる割合）を出す。
// 仕様 1: 同じ線は一致する。両端の位置の差が許容差（既定 50 mm、仮置き）以内なら、ずれていても一致する（端の向きは問わない）。
// 仕様 2: 許容差より大きくずれた線は一致しない。
// 仕様 3: 正解の線 2 本のうち 1 本だけ描いたときの再現率は 0.5、適合率は 1。
// 仕様 4: 正解にない余分な線を描いたときの適合率は下がる（描いた 2 本のうち 1 本が正解なら 0.5）。
// 仕様 5: 一つの正解の線には、一つの描いた線だけが対応する（二重に数えない）。
// 仕様 6: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { matchPracticeLines } from './practiceMatch'

type L = { a: { x: number; y: number }; b: { x: number; y: number } }

const truth: L[] = [
  { a: { x: 0, y: 0 }, b: { x: 6000, y: 0 } },
  { a: { x: 3000, y: 0 }, b: { x: 3000, y: 6000 } },
]

describe('一致の判定（仕様 1〜2）', () => {
  it('同じ線は一致し、再現率も適合率も 1', () => {
    const r = matchPracticeLines(truth, truth)
    expect(r.recall).toBe(1)
    expect(r.precision).toBe(1)
  })

  it('端が 20 mm ずれた線（許容差内）は一致し、端が逆向きでも一致する', () => {
    const drawn: L[] = [
      { a: { x: 6000, y: 20 }, b: { x: 0, y: 0 } },
      { a: { x: 3000, y: 0 }, b: { x: 3000, y: 6000 } },
    ]
    expect(matchPracticeLines(truth, drawn).recall).toBe(1)
  })

  it('許容差より大きく（100 mm）ずれた線は一致しない', () => {
    const drawn: L[] = [{ a: { x: 0, y: 100 }, b: { x: 6000, y: 100 } }]
    expect(matchPracticeLines(truth, drawn).recall).toBe(0)
  })
})

describe('再現率と適合率（仕様 3〜4）', () => {
  it('正解 2 本のうち 1 本だけ描いたときは、再現率 0.5、適合率 1', () => {
    const r = matchPracticeLines(truth, [truth[0]!])
    expect(r.recall).toBe(0.5)
    expect(r.precision).toBe(1)
  })

  it('正解にない余分な線を足すと、適合率は下がる（描いた 2 本のうち 1 本が正解なら 0.5）', () => {
    const extra: L[] = [truth[0]!, { a: { x: 0, y: 3000 }, b: { x: 6000, y: 3000 } }]
    const r = matchPracticeLines(truth, extra)
    expect(r.recall).toBe(0.5)
    expect(r.precision).toBe(0.5)
  })
})

describe('一対一の対応（仕様 5）', () => {
  it('同じ正解に、描いた線が二本あっても、一本分しか数えない', () => {
    const dup: L[] = [truth[0]!, { a: { x: 0, y: 10 }, b: { x: 6000, y: 10 } }]
    const r = matchPracticeLines(truth, dup)
    expect(r.recall).toBe(0.5)
    expect(r.precision).toBe(0.5)
  })
})

describe('同じ入力（仕様 6）', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const drawn: L[] = [truth[0]!]
    const before = JSON.stringify(drawn)
    expect(matchPracticeLines(truth, drawn)).toEqual(matchPracticeLines(truth, drawn))
    expect(JSON.stringify(drawn)).toBe(before)
  })
})
