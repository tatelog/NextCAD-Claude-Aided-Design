// 測定面の候補の確定（ハブ A-03 G87。統括の決定 2026-11-04、A-03 版 48）。
// 判定に使う測定面は、表から出た候補を自動では使わない。人が「確定」した値だけを、条例の値（測定面の高さ）として入れる（G15 と同じ扱い）。
import type { SuggestResult } from './shadowSuggest'
import { SHADOW_KEYS } from './shadowOrdinance'

export interface ConfirmActions {
  setEntry: (key: string, value: string, source: string) => void
  confirm: (key: string) => void
}

/** 候補を測定面の条例の値として確定する（値と出典を入れ、確認を取る）。候補が決まっていなければ何もせず false */
export function confirmMeasurement(candidate: SuggestResult, act: ConfirmActions): boolean {
  if (!candidate.ok) return false
  const { measurementM, band } = candidate.measurement
  act.setEntry(SHADOW_KEYS.height, String(measurementM), `東京都日影条例 別表第一（${band}）の候補を人が確定`)
  act.confirm(SHADOW_KEYS.height)
  return true
}
