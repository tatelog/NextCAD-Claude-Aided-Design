// 描いた線と正解の線の照合（ハブ A-03 G11・G10 の素材）。再現率と適合率を出す。決定論。
// 一致の判定は端点の位置（既定の許容差 50 mm は仮置き。A-07 と代表の確認で決め直す）。端の順は問わない。
// 対応は一対一（正解の線の順に、まだ対応していない描いた線を探す）。

export interface MatchLine {
  a: { x: number; y: number }
  b: { x: number; y: number }
}

export interface MatchResult {
  /** 正解のうち、描けた割合（0〜1）。正解が無ければ 0 */
  recall: number
  /** 描いた線のうち、正解に当たる割合（0〜1）。描いた線が無ければ 0 */
  precision: number
}

/** 許容差（mm）の既定。仮置き */
export const MATCH_TOLERANCE_MM = 50

const dist = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y)

// 両端の位置の差が、どちらの端の順でも許容差以内か
function sameLine(t: MatchLine, d: MatchLine, tol: number): boolean {
  const straight = Math.max(dist(t.a, d.a), dist(t.b, d.b))
  const swapped = Math.max(dist(t.a, d.b), dist(t.b, d.a))
  return Math.min(straight, swapped) <= tol
}

export function matchPracticeLines(truth: readonly MatchLine[], drawn: readonly MatchLine[], tolMm: number = MATCH_TOLERANCE_MM): MatchResult {
  const usedDrawn = new Set<number>()
  let matchedTruth = 0
  for (const t of truth) {
    const i = drawn.findIndex((d, j) => !usedDrawn.has(j) && sameLine(t, d, tolMm))
    if (i >= 0) {
      usedDrawn.add(i)
      matchedTruth++
    }
  }
  return {
    recall: truth.length === 0 ? 0 : matchedTruth / truth.length,
    precision: drawn.length === 0 ? 0 : usedDrawn.size / drawn.length,
  }
}
