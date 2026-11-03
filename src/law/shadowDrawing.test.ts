import { describe, expect, it } from 'vitest'
import { shadowDrawing } from './shadowDrawing'
import { shadowRuleFor } from './shadowRule'

// 仕様（ユーザー指示「日影図の作成もボリューム模型作成時に。RC限定で今回はやっていい」、法56条の2、
// 既存の日影規制の判定 judgeShadow と同じ前提）から書いたテスト。
// - RC 造だけ日影図を作る。RC 造以外は作らず、理由を返す。
// - 高さ10m以下の建物は対象外（D25: 高さ10m超）。
// - 冬至日の 8:00〜16:00（日本時間）を10分刻みで見る（49 点）。
// - 同じ入力からは同じ図が出る（決定論）。

const WINTER_SOLSTICE = new Date(Date.UTC(2026, 11, 22))
const LAT = 35.67
const LON = 139.8
const rule = shadowRuleFor('住居系', 2)!

// 敷地・建物の外形は反時計回りの正方形（mm）
function square(cx: number, cy: number, half: number) {
  return [
    { x: cx - half, y: cy - half },
    { x: cx + half, y: cy - half },
    { x: cx + half, y: cy + half },
    { x: cx - half, y: cy + half },
  ]
}

const lot40 = square(0, 0, 20_000)
const building14 = { footprint: square(0, 0, 10_000), heightMm: 14_000 }

function input(overrides: Partial<Parameters<typeof shadowDrawing>[0]> = {}) {
  return {
    structure: 'RC' as const,
    lot: lot40,
    building: building14,
    rule,
    lat: LAT,
    lon: LON,
    date: WINTER_SOLSTICE,
    ...overrides,
  }
}

describe('日影図（RC 造に限る）', () => {
  it('RC 造で高さ14mの建物は日影図を作る', () => {
    const result = shadowDrawing(input())
    expect(result.status).toBe('ok')
  })

  it('RC 造以外は日影図を作らず、理由（RC 造に限る）を返す', () => {
    for (const structure of ['SRC', 'S', 'W', 'other'] as const) {
      const result = shadowDrawing(input({ structure }))
      expect(result.status).toBe('unsupported')
      if (result.status === 'unsupported') expect(result.reason).toContain('RC')
    }
  })

  it('高さ10m以下の建物は日影規制の対象外として、図を作らない', () => {
    const atTen = shadowDrawing(input({ building: { footprint: building14.footprint, heightMm: 10_000 } }))
    expect(atTen.status).toBe('not_required')
    const underTen = shadowDrawing(input({ building: { footprint: building14.footprint, heightMm: 9_500 } }))
    expect(underTen.status).toBe('not_required')
  })

  it('冬至日の 8:00〜16:00（日本時間）を10分刻みで見る（8時間＝48点。16:00 の点は含めない）', () => {
    const result = shadowDrawing(input())
    expect(result.status).toBe('ok')
    if (result.status === 'ok') expect(result.sunSamples).toBe(48)
  })

  it('敷地境界から十分離れた低い建物は、規制に適合する（敷地外の測定点で日影時間は0）', () => {
    // 朝の低い太陽では建物の影が格子の外れまで伸びるが、測定点（敷地境界の外側）には届かない
    const farLot = square(0, 0, 100_000)
    const low = { footprint: square(0, 0, 10_000), heightMm: 10_500 }
    const result = shadowDrawing(input({ lot: farLot, building: low }))
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.judgment.result).toBe('適合')
      expect(result.judgment.maxHours).toBe(0)
    }
  })

  it('日影の格子の値は0より大きく、冬至日の最大時間（8時間）以下である', () => {
    const result = shadowDrawing(input())
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.cells.length).toBeGreaterThan(0)
      for (const c of result.cells) {
        expect(c.hours).toBeGreaterThan(0)
        expect(c.hours).toBeLessThanOrEqual(8)
      }
    }
  })

  it('同じ入力からは同じ図が出る（決定論）', () => {
    expect(shadowDrawing(input())).toEqual(shadowDrawing(input()))
  })
})
