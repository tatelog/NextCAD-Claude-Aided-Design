// 要確認の閾値（ハブ A-03 G10・G14）。Claude の提案の確信度が閾値以上なら確定、未満なら要確認。
// 閾値は仮置き（G10 で測ってから決める）。確信度は Claude の自己申告で、キャリブレーションされていない（決定論の検証との突き合わせは別の作業）。
export const REVIEW_THRESHOLD = 0.8

export type ProposalStatus = 'confirmed' | 'needs_review'

/** 提案の確認状態。数でない・0〜1 の外は、安全側に要確認 */
export function reviewStatusOf(confidence: number): ProposalStatus {
  if (!(confidence >= 0 && confidence <= 1)) return 'needs_review'
  return confidence >= REVIEW_THRESHOLD ? 'confirmed' : 'needs_review'
}
