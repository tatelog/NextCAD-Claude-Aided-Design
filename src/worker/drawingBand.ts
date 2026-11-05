// Drawing モードの判定の三つの帯（ハブ A-03 G82・G109・G124。閾値は仮置き、G10 で測ってから決める）。
// 実効信頼度（確信度 × 決定論の検査の通過率）が 0.85 以上は確定、0.5 以上 0.85 未満は要確認、0.5 未満と数でない値は人が種類を選ぶ（種類を入れない）。
// 店舗への入れ方は W1 の suggest と同じ（確定・要確認の印）。人が選ぶ帯だけ、種類を入れない。
import { effectiveConfidence } from '../plan/effectiveConfidence'
import type { Kind } from '../plan/semantic'
import { useSemantic } from '../store/semantic'

/** 確定の下限（仮置き、G10） */
export const DRAWING_CONFIRM_MIN = 0.85
/** 要確認の下限。これ未満は人が種類を選ぶ（仮置き、G10） */
export const DRAWING_REVIEW_MIN = 0.5

export type DrawingBand = 'confirmed' | 'review' | 'human'

/** 確信度と決定論の検査の結果から、帯を決める。数でない値は人が選ぶ側 */
export function drawingBandOf(confidence: number, checks: readonly boolean[] = []): DrawingBand {
  const e = effectiveConfidence(confidence, checks)
  if (!(e >= DRAWING_REVIEW_MIN)) return 'human'
  return e >= DRAWING_CONFIRM_MIN ? 'confirmed' : 'review'
}

/** Claude の判定を店舗に入れる。人が選ぶ帯の線には種類を入れない（G14・G109） */
export function suggestDrawnSegment(segmentId: string, kind: Kind, confidence: number): void {
  if (drawingBandOf(confidence) === 'human') return
  useSemantic.getState().suggest(segmentId, kind, confidence)
}
