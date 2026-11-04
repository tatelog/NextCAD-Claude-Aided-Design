// 表示グリッドと入力スナップの段（D-02 C1 仮置き）。拡大率（1 px あたりの mm）で切り替える。
// 描画にも状態にも依存しない純粋な処理。

/** 表示グリッドの 1 目盛りが画面上でとれる上限の大きさ（px）。仮置き。 */
export const GRID_CELL_MAX_PX = 200

export interface GridStep {
  /** 表示グリッドの 1 目盛り（mm）。 */
  readonly displayMm: number
  /** 入力スナップの刻み（mm）。表示グリッドとは別の値として持つ。 */
  readonly snapMm: number
}

/**
 * 粗い方から細かい方へ。（表示 mm, 入力スナップ mm）の組。
 * 仕様の書き方「表示 1000/500」を、表示＝前、入力スナップ＝後と読む（この読みは仮置き）。
 */
export const GRID_STEPS: readonly GridStep[] = [
  { displayMm: 1000, snapMm: 500 },
  { displayMm: 500, snapMm: 100 },
  { displayMm: 100, snapMm: 10 },
  { displayMm: 10, snapMm: 1 },
]

/**
 * 表示グリッドの 1 目盛りが画面上で GRID_CELL_MAX_PX 以下になる、最も粗い段を選ぶ（ちょうどは含む）。
 * どの段も当てはまらないときは最も細かい段。
 */
export function gridStepFor(mmPerPx: number): GridStep {
  const coarsestFit = GRID_STEPS.find((step) => step.displayMm / mmPerPx <= GRID_CELL_MAX_PX)
  return coarsestFit ?? GRID_STEPS[GRID_STEPS.length - 1]!
}
