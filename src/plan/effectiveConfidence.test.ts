// 仕様（ハブ A-03 G131。統括の依頼 2026-11-05）: 実効信頼度 ＝ Claude の確信度 × 決定論の検査の通過率。閾値（0.85・0.5）は仮置きのまま（G10）。
// 仕様 1: 検査が全部通れば、実効信頼度は確信度と同じ。
// 仕様 2: 検査が半分通れば、確信度の半分。
// 仕様 3: 検査が無いときは、確信度と同じ（通過率を 1 とみなす）。
// 仕様 4: 確信度は 0〜1 に収める。範囲外は端に寄せ、数でない（NaN・無限大）は 0 にして要確認の側に寄せる。
import { describe, expect, it } from 'vitest'
import { effectiveConfidence } from './effectiveConfidence'

describe('実効信頼度（G131）', () => {
  it('仕様 1: 検査が全部通れば、確信度と同じ', () => {
    expect(effectiveConfidence(0.9, [true, true, true])).toBeCloseTo(0.9, 10)
  })

  it('仕様 2: 検査が半分通れば、確信度の半分', () => {
    expect(effectiveConfidence(0.8, [true, false])).toBeCloseTo(0.4, 10)
  })

  it('仕様 3: 検査が無いときは、確信度と同じ', () => {
    expect(effectiveConfidence(0.9, [])).toBeCloseTo(0.9, 10)
  })

  it('仕様 4: 範囲外は端に寄せ、数でない確信度は 0 にする', () => {
    expect(effectiveConfidence(1.4, [])).toBe(1)
    expect(effectiveConfidence(-0.2, [])).toBe(0)
    expect(effectiveConfidence(Number.NaN, [true])).toBe(0)
    expect(effectiveConfidence(Number.POSITIVE_INFINITY, [])).toBe(0)
  })
})
