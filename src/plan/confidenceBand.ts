// 確信度の三つの帯（D-02 の閾値の行・ハブ G10。根拠の決定は G82（代表、確定））。
// 0.85 以上は確定（印なし）、0.5 以上 0.85 未満は要確認の印、0.5 未満と数でない値は人が種類を選ぶ（種類を入れない）。
// W1（Claude の提案。店舗の suggest）と Drawing の判定は、この一つの関数を使う（二つの実装を並べない）。閾値は仮置き（G10 で測ってから決める）。
import { effectiveConfidence } from './effectiveConfidence'

/** 確定の下限（仮置き、G10） */
export const CONFIRM_MIN = 0.85
/** 要確認の下限。これ未満は人が種類を選ぶ（仮置き、G10） */
export const REVIEW_MIN = 0.5

export type ConfidenceBand = 'confirmed' | 'review' | 'human'

/**
 * 確信度（と、あれば決定論の検査の結果）から帯を決める。
 * 数でない値（NaN・無限大）は人が選ぶ。0 から 1 の外の数は、安全側に要確認。
 */
export function confidenceBandOf(confidence: number, checks: readonly boolean[] = []): ConfidenceBand {
  if (!Number.isFinite(confidence)) return 'human'
  if (confidence < 0 || confidence > 1) return 'review'
  const e = effectiveConfidence(confidence, checks)
  if (!(e >= REVIEW_MIN)) return 'human'
  return e >= CONFIRM_MIN ? 'confirmed' : 'review'
}
