// 実効信頼度（ハブ A-03 G131。統括の依頼 2026-11-05）: 実効信頼度 ＝ Claude の確信度 × 決定論の検査の通過率。
// 検査（直交・接続・閉合など）の結果が無いときは、通過率を 1 とみなし、確信度をそのまま返す。
// 閾値（0.85・0.5）は仮置きのまま（G10）。閾値の判定は reviewThreshold.ts に残す。
// 確信度は 0〜1 に収める。数でない（NaN・無限大）は 0 にして、要確認の側に寄せる。

export function effectiveConfidence(confidence: number, checks: readonly boolean[]): number {
  if (!Number.isFinite(confidence)) return 0
  const c = Math.min(1, Math.max(0, confidence))
  if (checks.length === 0) return c
  const passRate = checks.filter((ok) => ok).length / checks.length
  return c * passRate
}
