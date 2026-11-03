// 仕様: P3 線の意味判定（D-02 C2、D-03 T-03、A-03 G9・G13・G14・G31）。Claude の判断は決定論で裏を取る。
// 仕様 1（G13 種別）: 種別は wall・column・beam・opening・grid・room・other の 7 つだけ。外れた種別は出力全体を弾く（C12）。
// 仕様 2（C2 信頼度）: 確信度は 0 以上 1 以下の数。範囲外は弾く。
// 仕様 3（C2 直交）: 直線の線分は、最も近い軸（X・Y）との角度が ±3° 以内なら直交。外れたら幾何検証は不合格。曲線は直交を見ない（G8）。
// 仕様 4（T-03 結果）: 幾何検証が不合格なら結果は「要確認」。合格なら「適合」。
// 仕様 5（G9）: F4 の外形の線は判定の対象外（ここでは扱わない。呼び出し側が渡さない）。
import { describe, expect, it } from 'vitest'
import { parseClassifierOutput, checkOrthogonal, judgeSegment } from './semantic'

describe('parseClassifierOutput（スキーマ強制）', () => {
  it('7 つの種別と確信度 0〜1 の出力を受け入れる', () => {
    const out = parseClassifierOutput([
      { segment_id: 's1', kind: 'wall', confidence: 0.9 },
      { segment_id: 's2', kind: 'grid', confidence: 0 },
    ])
    expect(out).toHaveLength(2)
  })

  it('外れた種別（例: 外形・door）は出力全体を弾く', () => {
    expect(() => parseClassifierOutput([{ segment_id: 's1', kind: '外形', confidence: 0.9 }])).toThrow()
    expect(() => parseClassifierOutput([{ segment_id: 's1', kind: 'door', confidence: 0.9 }])).toThrow()
  })

  it('確信度が 0〜1 の外なら弾く', () => {
    expect(() => parseClassifierOutput([{ segment_id: 's1', kind: 'wall', confidence: 1.2 }])).toThrow()
  })
})

describe('checkOrthogonal（直交の検査）', () => {
  it('水平・垂直の線分は合格', () => {
    expect(checkOrthogonal({ a: { x: 0, y: 0 }, b: { x: 5_000, y: 0 } })?.pass).toBe(true)
    expect(checkOrthogonal({ a: { x: 0, y: 0 }, b: { x: 0, y: 5_000 } })?.pass).toBe(true)
  })

  it('軸から 3° 以内の傾きは合格、3° を超えれば不合格', () => {
    // 軸から約 2.9° → 合格
    const near = { a: { x: 0, y: 0 }, b: { x: 10_000, y: 506 } }
    expect(checkOrthogonal(near)?.pass).toBe(true)
    // 軸から約 3.5° → 不合格
    const far = { a: { x: 0, y: 0 }, b: { x: 10_000, y: 611 } }
    expect(checkOrthogonal(far)?.pass).toBe(false)
  })

  it('曲線は直交を見ない（合格扱いにはせず、対象外として null）', () => {
    expect(checkOrthogonal({ a: { x: 0, y: 0 }, b: { x: 10_000, y: 5_000 }, curved: true })).toBeNull()
  })
})

describe('judgeSegment（結果）', () => {
  it('幾何検証が合格なら「適合」、不合格なら「要確認」', () => {
    expect(judgeSegment({ a: { x: 0, y: 0 }, b: { x: 5_000, y: 0 } })).toBe('適合')
    expect(judgeSegment({ a: { x: 0, y: 0 }, b: { x: 10_000, y: 2_000 } })).toBe('要確認')
  })

  it('曲線の線分は直交の検査を受けないので「適合」', () => {
    expect(judgeSegment({ a: { x: 0, y: 0 }, b: { x: 10_000, y: 2_000 }, curved: true })).toBe('適合')
  })
})
