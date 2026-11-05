// P3 の入力の足りないところを、画面に出す一文にする（統括の依頼 2026-11-06「ZodError の JSON を出さない」）。決定論。
// 検査の ZodError は、JSON や英文ではなく「入力を確かめてください」の一文にする。計算の理由（普通の Error）は、そのまま出す。
import { ZodError } from 'zod'

/** 目標の戸数（1 以上の整数）。空の欄は 0 になるので、ここで一文にする */
export function missingTargetOf(target: number): string | null {
  return Number.isInteger(target) && target >= 1 ? null : '目標の戸数を入れてください（1 以上の整数）'
}

/** 建物の寸法（mm）。0 以下・数でない（空の欄）のときは、その項目の一文。最初に足りない項目を言う */
export function missingDimensionOf(d: {
  widthMm: number
  depthMm: number
  corridorMm: number
  unitDepthMm: number
  spanMm: number
}): string | null {
  if (!(d.widthMm > 0)) return '建物の幅を入れてください（mm）'
  if (!(d.depthMm > 0)) return '建物の奥行を入れてください（mm）'
  if (!(d.corridorMm > 0)) return '廊下幅を入れてください（mm）'
  if (!(d.unitDepthMm > 0)) return '住戸の奥行を入れてください（mm）'
  if (!(d.spanMm > 0)) return 'スパンを入れてください（mm）'
  return null
}

/** 画面に出す文。ZodError は英文の JSON になるので出さず、入力を確かめる一文にする */
export function plainErrorTextOf(e: unknown): string {
  if (e instanceof ZodError) return '入力の数を確かめてください（数の範囲が正しくありません）'
  return e instanceof Error ? e.message : String(e)
}
