// 仕様（平成12年建設省告示第1433号 第四・第五。G28 の部品。組み合わせ方は未確認）:
// 仕様 1: RC 造の外壁（耐力壁、かぶり 3 cm 以上）の屋外火災保有耐火時間 = min［max｛1.7(cd)² / (log_e(0.673/(cd)^(1/3)))², 1.29｝, 0.012 · CD · D²］（分）。
//        c は熱特性係数、d は熱劣化深さ（mm）、CD は遮熱特性係数、D は壁の厚さ（mm）。
// 仕様 2: 第二の項の 0.012 · CD · D² が小さいときは、それが上限になる（D = 20 mm、CD = 1.0 なら 0.012 × 400 = 4.8 分）。
// 仕様 3: 防火戸の保有遮炎時間 = 20 · (460/α)^(3/2)。特定防火設備は 60 · (460/α)^(3/2)（分）。α = 460 なら 20 分と 60 分。
// 仕様 4: 入力が不正（d ≤ 0、cd が 0.673^3 に等しい、D ≤ 0、α ≤ 0）なら例外。
// 仕様 5: 同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { outerWallFireTimeMin, fireDoorHoldMin, specifiedFireDoorHoldMin } from './fireTime'

describe('外壁の屋外火災保有耐火時間（仕様 1〜2）', () => {
  it('第二の項が小さいときは、0.012 · CD · D² が上限（D = 20 mm、CD = 1.0 で 4.8 分）', () => {
    expect(outerWallFireTimeMin({ c: 0.21, d: 50, CD: 1.0, D: 20 })).toBeCloseTo(4.8, 9)
  })

  it('第一の項と第二の項の小さいほう（D = 200 mm は第二の項が 480 分で大きいので、第一の項で決まり、正の値）', () => {
    const t = outerWallFireTimeMin({ c: 0.21, d: 50, CD: 1.0, D: 200 })
    expect(t).toBeGreaterThan(0)
    expect(t).toBeLessThan(480)
  })
})

describe('防火戸の保有遮炎時間（仕様 3）', () => {
  it('α = 460 なら、防火戸は 20 分、特定防火設備は 60 分', () => {
    expect(fireDoorHoldMin(460)).toBeCloseTo(20, 9)
    expect(specifiedFireDoorHoldMin(460)).toBeCloseTo(60, 9)
  })

  it('α = 115 なら、(460/115)^(3/2) = 8。防火戸は 160 分、特定防火設備は 480 分', () => {
    expect(fireDoorHoldMin(115)).toBeCloseTo(160, 9)
    expect(specifiedFireDoorHoldMin(115)).toBeCloseTo(480, 9)
  })
})

describe('不正な入力（仕様 4）', () => {
  it('d ≤ 0、D ≤ 0、α ≤ 0 は例外', () => {
    expect(() => outerWallFireTimeMin({ c: 0.21, d: 0, CD: 1.0, D: 200 })).toThrow()
    expect(() => outerWallFireTimeMin({ c: 0.21, d: 50, CD: 1.0, D: 0 })).toThrow()
    expect(() => fireDoorHoldMin(0)).toThrow()
  })
})

describe('同じ入力（仕様 5）', () => {
  it('同じ入力には同じ出力', () => {
    expect(outerWallFireTimeMin({ c: 0.21, d: 50, CD: 1.0, D: 200 })).toBe(outerWallFireTimeMin({ c: 0.21, d: 50, CD: 1.0, D: 200 }))
  })
})
