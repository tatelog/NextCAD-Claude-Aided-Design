// 画面のタブ（共通ヘッダーの流れ P1〜P4、出力 P5）。id は画面の内部の名前、name は画面に出す名前。
export const SCREENS = [
  { id: 'P1', name: '敷地' },
  { id: 'P2', name: 'ボリューム' },
  { id: 'P3', name: '平面' },
  { id: 'P4', name: '積算' },
  { id: 'P5', name: '出力' },
] as const

export type ScreenId = (typeof SCREENS)[number]['id']

// 画面の順番（代表の決定 2026-11-08）。「次へ」を一つずつ押して進む。開けた範囲（reached）は SCREENS の添字で持つ。
/** 保存した案件を開いたときの範囲（全部の画面を開ける） */
export const ALL_REACHED = SCREENS.length - 1

const indexOf = (id: ScreenId): number => SCREENS.findIndex((s) => s.id === id)

/** その画面を開けるか。開けた範囲の中なら、どこへでも戻れる */
export function screenOpen(id: ScreenId, reached: number): boolean {
  return indexOf(id) <= reached
}

/** 「次へ」で to の画面へ進んだあとの範囲。狭くはならない */
export function reachedAfterNext(reached: number, to: ScreenId): number {
  return Math.max(reached, indexOf(to))
}

const NEXT_OF: Record<ScreenId, string> = {
  P1: '',
  P2: '敷地を確定して「次へ」を押してください',
  P3: 'ボリュームで配置を計算し、平面へ引き継いで「次へ」を押してください',
  P4: '平面を確認して「積算へ」を押してください',
  P5: '積算を確認して「次へ（出力）」を押してください',
}

/** 開けない画面の理由（前の画面で済ませること）。開けるなら null */
export function lockReasonOf(id: ScreenId, reached: number): string | null {
  return screenOpen(id, reached) ? null : `先に${NEXT_OF[id]}`
}
