import { describe, expect, it } from 'vitest'
import { shadowDrawing, shadowDrawingSummary } from './shadowDrawing'
import { pointInPolygon } from './shadowRegulation'
import { shadowRuleFor } from './shadowRule'

// 仕様（ユーザー指示「日影図の作成もボリューム模型作成時に。RC限定で今回はやっていい」、法56条の2、
// 既存の日影規制の判定 judgeShadow と同じ前提）から書いたテスト。
// - RC 造だけ日影図を作る。RC 造以外は作らず、理由を返す。
// - 規制の対象（別表第四）に当たらない建物は作らない（対象外の理由を返す）。
// - 冬至日の真太陽時 8:00〜16:00 を 10分刻み（48 点）で見る。
// - 切り取った階（複数の建物）も、判定と同じく全部を影にする。
// - 同じ入力からは同じ図が出る（決定論）。
// - 判定と同じ建物だけを影にする（測定面の高さ以下の階は影を作らない）。（t38）
// - 要約の点数と最大は、規制の測定点と同じ敷地の外側の格子で数える（建物の下や敷地の中は数えない）。（t38）

const WINTER_SOLSTICE = new Date(Date.UTC(2026, 11, 22))
const LAT = 35.67
const LON = 139.86
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
    buildings: [building14],
    rule,
    lat: LAT,
    lon: LON,
    date: WINTER_SOLSTICE,
    ...overrides,
  }
}

describe('日影図（RC 造に限る）', () => {
  it('RC 造で高さ14mの建物は日影図を作る', () => {
    expect(shadowDrawing(input()).status).toBe('ok')
  })

  it('RC 造以外は日影図を作らず、理由（RC 造に限る）を返す', () => {
    for (const structure of ['SRC', 'S', 'W', 'other'] as const) {
      const result = shadowDrawing(input({ structure }))
      expect(result.status).toBe('unsupported')
      if (result.status === 'unsupported') expect(result.reason).toContain('RC')
    }
  })

  it('規制の対象（住居系は高さ10m超）に当たらない建物は、日影図を作らない', () => {
    const atTen = shadowDrawing(input({ buildings: [{ footprint: building14.footprint, heightMm: 10_000 }] }))
    expect(atTen.status).toBe('not_required')
    const underTen = shadowDrawing(input({ buildings: [{ footprint: building14.footprint, heightMm: 9_500 }] }))
    expect(underTen.status).toBe('not_required')
  })

  it('冬至日の真太陽時 8:00〜16:00 を 10分刻みで見る（8時間＝48点）', () => {
    const result = shadowDrawing(input())
    expect(result.status).toBe('ok')
    if (result.status === 'ok') expect(result.sunSamples).toBe(48)
  })

  it('敷地境界から十分離れた低い建物は、規制に適合する（敷地外の測定点で日影時間は0）', () => {
    const farLot = square(0, 0, 100_000)
    const low = { footprint: square(0, 0, 10_000), heightMm: 10_500 }
    const result = shadowDrawing(input({ lot: farLot, buildings: [low] }))
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.judgment.result).toBe('適合')
      expect(result.judgment.maxHours).toBe(0)
    }
  })

  it('切り取った階（複数の建物）も影にする。階を足すと影が増える', () => {
    const one = shadowDrawing(input())
    const two = shadowDrawing(input({ buildings: [building14, { footprint: square(0, 0, 10_000), heightMm: 4_000 }] }))
    expect(one.status).toBe('ok')
    expect(two.status).toBe('ok')
    if (one.status === 'ok' && two.status === 'ok') {
      expect(two.cells.length).toBeGreaterThanOrEqual(one.cells.length)
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

  it('判定と同じ建物だけを影にする（測定面の高さ以下の階は影を作らない）', () => {
    const lowFloor = { footprint: square(0, 0, 10_000), heightMm: 3_000 }
    expect(shadowDrawing(input({ buildings: [lowFloor, building14] }))).toEqual(shadowDrawing(input()))
  })
})

describe('日影図の要約（P2 の判定文に出す）', () => {
  it('影が落ちる格子の点数と最大時間を一行で書く', () => {
    const text = shadowDrawingSummary(shadowDrawing(input()))
    expect(text).toContain('日影図')
    expect(text).toMatch(/格子 \d+ 点/)
    expect(text).toMatch(/最大 \d+\.\d h/)
  })

  it('点数と最大は、敷地の外側の格子で数える（建物の下や敷地の中は数えない）', () => {
    const result = shadowDrawing(input())
    if (result.status !== 'ok') throw new Error(result.status)
    const outside = result.cells.filter((c) => !pointInPolygon(c, lot40))
    const outsideMax = outside.reduce((m, c) => Math.max(m, c.hours), 0)
    const allMax = result.cells.reduce((m, c) => Math.max(m, c.hours), 0)
    expect(allMax).toBeGreaterThan(outsideMax)
    expect(shadowDrawingSummary(result)).toBe(`日影図: 影が落ちる格子 ${outside.length} 点、最大 ${outsideMax.toFixed(1)} h（格子 2 m）`)
  })

  it('RC 造以外は、理由をそのまま出す', () => {
    const text = shadowDrawingSummary(shadowDrawing(input({ structure: 'W' })))
    expect(text).toContain('RC')
  })

  it('対象外は、対象外の理由を出す', () => {
    const text = shadowDrawingSummary(shadowDrawing(input({ buildings: [{ footprint: building14.footprint, heightMm: 9_000 }] })))
    expect(text).toContain('対象外')
  })
})
