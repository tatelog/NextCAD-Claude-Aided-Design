// 提案の確認状態（ハブ A-03 G10・G14）。帯の決め方は confidenceBand.ts の一つの関数に任せる（W1 と Drawing で共通。G82）。
// 0.85 以上は確定（印なし）、0.5 以上 0.85 未満は要確認、0.5 未満と数でない値は人が種類を選ぶ（店舗に入らない。null）。
// 閾値は仮置き（G10 で測ってから決める）。確信度は Claude の自己申告で、キャリブレーションされていない。
import { CONFIRM_MIN, confidenceBandOf } from './confidenceBand'

/** 二段閾値の上段（確定の下限）。仮置き（G10） */
export const REVIEW_THRESHOLD = CONFIRM_MIN

export type ProposalStatus = 'confirmed' | 'needs_review'

/** 提案の確認状態。人が種類を選ぶ帯（0.5 未満・数でない値）は null（種類を入れない） */
export function reviewStatusOf(confidence: number): ProposalStatus | null {
  const band = confidenceBandOf(confidence)
  if (band === 'human') return null
  return band === 'confirmed' ? 'confirmed' : 'needs_review'
}
