// 仕様（ハブ A-03 G134。統括の依頼 2026-11-05）: 寸法線の表記は mm の整数。小数は四捨五入して出す。
// 仕様 1: 整数の mm は、そのまま「6000 mm」。
// 仕様 2: 小数は四捨五入する（20000.4 → 20000、6000.5 → 6001）。
// 仕様 3: ゼロと負の値も整数で出す（-0.4 → 0 mm）。
// 仕様 4（G134 の例外。設計グリル・統括 2026-11-05）: 敷地からの離れ（北・東・南・西）は m・小数 2 桁（例 1.25 m）。
// 仕様 5: 離れの値が負（建物が敷地からはみ出す）なら、符号を付けて出す。
import { describe, expect, it } from 'vitest'
import { mmLabel, setbackLabel } from './dimensionLabel'

describe('寸法線の表記（G134）', () => {
  it('仕様 1: 整数の mm はそのまま出す', () => {
    expect(mmLabel(6000)).toBe('6,000 mm')
  })

  it('仕様 2: 小数は四捨五入する', () => {
    expect(mmLabel(20000.4)).toBe('20,000 mm')
    expect(mmLabel(6000.5)).toBe('6,001 mm')
  })

  it('仕様 3: ゼロと負の値も整数で出す', () => {
    expect(mmLabel(0)).toBe('0 mm')
    expect(mmLabel(-0.4)).toBe('0 mm')
  })
})

describe('敷地からの離れの表記（G134 の例外。t72）', () => {
  it('仕様 4: m・小数 2 桁で出す（1,250 mm は 1.25 m）', () => {
    expect(setbackLabel(1250)).toBe('1.25 m')
    expect(setbackLabel(0)).toBe('0.00 m')
    expect(setbackLabel(12000)).toBe('12.00 m')
  })

  it('仕様 5: 負の値は符号を付けて出す', () => {
    expect(setbackLabel(-300)).toBe('-0.30 m')
  })
})
