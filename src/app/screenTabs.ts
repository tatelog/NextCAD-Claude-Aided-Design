// 画面のタブ（共通ヘッダーの流れ P1〜P4、出力 P5）。id は画面の内部の名前、name は画面に出す名前。
export const SCREENS = [
  { id: 'P1', name: '敷地' },
  { id: 'P2', name: 'ボリューム' },
  { id: 'P3', name: '平面' },
  { id: 'P4', name: '積算' },
  { id: 'P5', name: '出力' },
] as const

export type ScreenId = (typeof SCREENS)[number]['id']
