import { describe, expect, it } from 'vitest'
import { GRID_CELL_MAX_PX, GRID_STEPS, gridStepFor } from './gridSteps'

// 仕様（D-02 C1 仮置き）
//  - 表示グリッドと入力スナップの段は、拡大率で切り替える
//  - 段は（表示 mm, 入力スナップ mm）の組: 1000/500、500/100、100/10、10/1 の 4 段
//    （書き方「表示 1000/500」は 表示＝前、入力スナップ＝後 と読む。この読みは仮置き）
//  - 入力スナップは表示グリッドと別設定（段の表では別々の値として持つ）
//  - 仮置きの規則: 表示グリッドの 1 目盛りが画面上で 200 px 以下になる、最も粗い段を選ぶ
//    ちょうど 200 px は含む。どの段も 200 px 以下にならないときは最も細かい段（10/1）
//  - 200 px は仮置きなので定数にする

/** 仕様の 4 段（表示 mm, 入力スナップ mm）。実装の表とは独立に、テスト側にも持つ */
const SPEC_STEPS: readonly (readonly [display: number, snap: number])[] = [
  [1000, 500],
  [500, 100],
  [100, 10],
  [10, 1],
]

describe('段の表（仮置き）', () => {
  it('段は（表示 mm, 入力スナップ mm）= 1000/500、500/100、100/10、10/1 の 4 段で、粗い方から並ぶ', () => {
    expect(GRID_STEPS.map((s) => [s.displayMm, s.snapMm])).toEqual(SPEC_STEPS)
  })

  it('表示グリッドの 1 目盛りの上限は画面上 200 px（仮置き）', () => {
    expect(GRID_CELL_MAX_PX).toBe(200)
  })
})

describe('gridStepFor: 1 px あたりの mm（拡大率）から段を選ぶ', () => {
  it.each([
    { label: '(h)', mmPerPx: 10, display: 1000, snap: 500 }, // 1000 mm = 100 px
    { label: '(i) 境界', mmPerPx: 5, display: 1000, snap: 500 }, // 1000 mm = ちょうど 200 px は含む
    { label: '(j)', mmPerPx: 4, display: 500, snap: 100 }, // 1000 mm = 250 px、500 mm = 125 px
    { label: '(k)', mmPerPx: 1, display: 100, snap: 10 }, // 500 mm = 500 px、100 mm = 100 px
    { label: '(l)', mmPerPx: 0.4, display: 10, snap: 1 }, // 100 mm = 250 px、10 mm = 25 px
    { label: '(m) どの段も 200 px 以下にならない', mmPerPx: 0.01, display: 10, snap: 1 }, // 10 mm = 1000 px
  ])('$label: 1 px = $mmPerPx mm → 表示 $display・入力スナップ $snap', ({ mmPerPx, display, snap }) => {
    const step = gridStepFor(mmPerPx)
    expect(step.displayMm).toBe(display)
    expect(step.snapMm).toBe(snap)
  })

  it.each([
    { label: '1000 mm の目盛りがちょうど 200 px', mmPerPx: 5, display: 1000, snap: 500 },
    { label: '1000 mm の目盛りが 200 px よりわずかに小さい', mmPerPx: 5.01, display: 1000, snap: 500 },
    { label: '1000 mm の目盛りが 200 px を僅かに超える → 次に細かい段', mmPerPx: 4.99, display: 500, snap: 100 },
    { label: '500 mm の目盛りがちょうど 200 px', mmPerPx: 2.5, display: 500, snap: 100 },
    { label: '500 mm の目盛りが 200 px よりわずかに小さい', mmPerPx: 2.51, display: 500, snap: 100 },
    { label: '500 mm の目盛りが 200 px を僅かに超える → 次に細かい段', mmPerPx: 2.49, display: 100, snap: 10 },
    { label: '100 mm の目盛りがちょうど 200 px', mmPerPx: 0.5, display: 100, snap: 10 },
    { label: '100 mm の目盛りが 200 px よりわずかに小さい', mmPerPx: 0.51, display: 100, snap: 10 },
    { label: '100 mm の目盛りが 200 px を僅かに超える → 次に細かい段', mmPerPx: 0.49, display: 10, snap: 1 },
  ])('境界: $label（1 px = $mmPerPx mm → $display/$snap）', ({ mmPerPx, display, snap }) => {
    const step = gridStepFor(mmPerPx)
    expect(step.displayMm).toBe(display)
    expect(step.snapMm).toBe(snap)
  })

  it('これ以上粗い段はない: 非常に縮小しても（1 px = 1000 mm、100000 mm）最も粗い 1000/500', () => {
    for (const mmPerPx of [1000, 100000]) {
      const step = gridStepFor(mmPerPx)
      expect(step.displayMm).toBe(1000)
      expect(step.snapMm).toBe(500)
    }
  })

  it('これ以上細かい段はない: 非常に拡大しても（1 px = 0.001 mm）最も細かい 10/1', () => {
    const step = gridStepFor(0.001)
    expect(step.displayMm).toBe(10)
    expect(step.snapMm).toBe(1)
  })

  it('規則: 1 px = 10^-3 〜 10^3 mm のどこでも、表示の 1 目盛りが画面上 200 px 以下になる最も粗い段が選ばれる', () => {
    for (let exponent = -3; exponent <= 3; exponent += 0.05) {
      const mmPerPx = 10 ** exponent
      const satisfying = SPEC_STEPS.filter(([display]) => display / mmPerPx <= GRID_CELL_MAX_PX)
      // 粗い方から並んでいるので、最初に条件を満たす段が「最も粗い段」。ひとつもなければ最も細かい段
      const expected = satisfying[0] ?? SPEC_STEPS[SPEC_STEPS.length - 1]!

      const step = gridStepFor(mmPerPx)
      expect([step.displayMm, step.snapMm], `1 px = ${mmPerPx} mm`).toEqual(expected)
    }
  })

  it('拡大していく（1 px あたりの mm が小さくなる）と、表示も入力スナップも細かくなる方向にしか動かない', () => {
    let previousDisplay = Infinity
    let previousSnap = Infinity
    for (let exponent = 3; exponent >= -3; exponent -= 0.01) {
      const step = gridStepFor(10 ** exponent)
      expect(step.displayMm).toBeLessThanOrEqual(previousDisplay)
      expect(step.snapMm).toBeLessThanOrEqual(previousSnap)
      previousDisplay = step.displayMm
      previousSnap = step.snapMm
    }
  })

  it('入力スナップは表示グリッドと別の値として返る（表示と同じ値に固定されない）', () => {
    for (const mmPerPx of [10, 4, 1, 0.4]) {
      const step = gridStepFor(mmPerPx)
      expect(step.snapMm).not.toBe(step.displayMm)
    }
  })
})
