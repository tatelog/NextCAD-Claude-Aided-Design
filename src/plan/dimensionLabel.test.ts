// 仕様（ハブ A-03 G134。統括の依頼 2026-11-05）: 寸法線の表記は mm の整数。小数は四捨五入して出す。
// 仕様 1: 整数の mm は、そのまま「6000 mm」。
// 仕様 2: 小数は四捨五入する（20000.4 → 20000、6000.5 → 6001）。
// 仕様 3: ゼロと負の値も整数で出す（-0.4 → 0 mm）。
// 注: P1 の敷地からの離れは、この規則の例外（表記は未決。t72）。ここでは扱わない。
import { describe, expect, it } from 'vitest'
import { mmLabel } from './dimensionLabel'

describe('寸法線の表記（G134）', () => {
  it('仕様 1: 整数の mm はそのまま出す', () => {
    expect(mmLabel(6000)).toBe('6000 mm')
  })

  it('仕様 2: 小数は四捨五入する', () => {
    expect(mmLabel(20000.4)).toBe('20000 mm')
    expect(mmLabel(6000.5)).toBe('6001 mm')
  })

  it('仕様 3: ゼロと負の値も整数で出す', () => {
    expect(mmLabel(0)).toBe('0 mm')
    expect(mmLabel(-0.4)).toBe('0 mm')
  })
})
