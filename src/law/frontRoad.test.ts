// 仕様: P1 前面道路の幅員（D-02 C4「前面道路の幅員」、D-03 T-02 敷地 attributes.front_roads、A-03 G16）。
// 仕様 1（対岸指定）: 敷地の辺の位置ごとに、外向きの法線の半直線を引き、公図の向かいの筆界との最も近い交点までの距離を幅員にする。
//   交点がなければ「算出不能」（幅員を出さない）。位置ごとの値を単一の数に潰さない（samples）。
// 仕様 2（数値指定）: 任意の正の数（mm）。0 以下は弾く。
// 仕様 3（資料指定）: 記載値・出典が必要。出典が空なら弾く。最小・最大の範囲は min ≤ max。
// 仕様 4: 地図から測った値は採用幅員にならない。採用幅員は adoptWidth で、採用理由と一緒に明示的に入れたときだけ決まる（G16）。
// 仕様 5: 採用理由が空の採用は弾く。
import { describe, expect, it } from 'vitest'
import { adoptWidth, measureOppositeWidth, outwardNormal, specifiedWidth, resourceWidth } from './frontRoad'

// 反時計回りの正方形の敷地（幅 10 m、奥行 10 m）。辺 0 は (0,0)→(10000,0)、道路は下（y < 0）側。
const parcel = [
  { x: 0, y: 0 },
  { x: 10_000, y: 0 },
  { x: 10_000, y: 10_000 },
  { x: 0, y: 10_000 },
]

describe('outwardNormal', () => {
  it('反時計回りの敷地の辺 0 の外向き法線は下向き（道路側）', () => {
    const n = outwardNormal(parcel, 0)
    expect(n.x).toBeCloseTo(0)
    expect(n.y).toBeCloseTo(-1)
  })
})

describe('measureOppositeWidth（対岸指定）', () => {
  // 向かいの筆界（道路の反対側の境界）: y = −4 m の水平線
  const opposite = [{ a: { x: -5_000, y: -4_000 }, b: { x: 15_000, y: -4_000 } }]

  it('辺の位置ごとに、外向きの半直線と向かいの筆界の交点までの距離を幅員にする', () => {
    const r = measureOppositeWidth(parcel, 0, opposite, [0, 0.5, 1])
    expect(r.samples.map((s) => s.width_mm)).toEqual([4_000, 4_000, 4_000])
    expect(r.samples.every((s) => s.status === 'ok')).toBe(true)
  })

  it('交点がない位置は「算出不能」にして幅員を出さない', () => {
    const far = [{ a: { x: 20_000, y: -4_000 }, b: { x: 30_000, y: -4_000 } }]
    const r = measureOppositeWidth(parcel, 0, far, [0.5])
    expect(r.samples[0]!.width_mm).toBeNull()
    expect(r.samples[0]!.status).toBe('算出不能')
  })

  it('測った値は採用幅員にならない（adopted_width は null のまま）', () => {
    const r = measureOppositeWidth(parcel, 0, opposite, [0.5])
    expect(r.adopted_width_mm).toBeNull()
    expect(r.adopted_reason).toBeNull()
  })
})

describe('specifiedWidth（数値指定）', () => {
  it('正の数（mm）を受け、出どころを利用者入力とする', () => {
    expect(specifiedWidth(6_000)).toEqual({ method: '数値指定', width_mm: 6_000, source: '利用者入力' })
  })
  it('0 以下は弾く', () => {
    expect(() => specifiedWidth(0)).toThrow()
    expect(() => specifiedWidth(-1_000)).toThrow()
  })
})

describe('resourceWidth（資料指定）', () => {
  it('記載値・範囲・出典を持つ', () => {
    expect(resourceWidth({ value_mm: 6_000, min_mm: 5_500, max_mm: 6_500, source: '資料 A 第 3 図' })).toEqual({
      method: '資料指定',
      width_mm: 6_000,
      min_mm: 5_500,
      max_mm: 6_500,
      source: '資料 A 第 3 図',
    })
  })
  it('出典が空、または範囲の最小が最大より大きければ弾く', () => {
    expect(() => resourceWidth({ value_mm: 6_000, min_mm: 5_500, max_mm: 6_500, source: '' })).toThrow()
    expect(() => resourceWidth({ value_mm: 6_000, min_mm: 7_000, max_mm: 6_500, source: '資料 A' })).toThrow()
  })
})

describe('adoptWidth（採用）', () => {
  it('採用幅員と採用理由を明示的に入れる', () => {
    const r = adoptWidth(4_000, '対岸の交点の最小値を採る')
    expect(r).toEqual({ adopted_width_mm: 4_000, adopted_reason: '対岸の交点の最小値を採る' })
  })
  it('採用理由が空なら弾く', () => {
    expect(() => adoptWidth(4_000, '')).toThrow()
  })
})
