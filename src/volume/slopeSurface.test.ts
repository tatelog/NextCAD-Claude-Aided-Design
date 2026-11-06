// 仕様（統括の指示 2026-11-06。5a: 3D に斜線の面を半透明で出し、建物が斜線に食い込んだ部分（切り取られた部分）を色で示す）:
// 仕様 K1: 斜線の上限の高さは、境界からの距離 d で rise + coef × d。距離の上限（道路斜線の D）以上は、制限しない（無限）。
// 仕様 K2: 切り取られた部分（食い込み）の面積は、外形の面積から、切り取り後の面積を引いたものに一致する。
// 仕様 K3: 天端が立ち上がり以下なら、切り取られた部分は無い。
// 仕様 K4: 斜線の面は、境界の線上で高さ rise、距離 D で rise + coef × D の傾いた四角形。
// 仕様 K5: 階ごとの食い込みは、その階の天端で切られた部分で、その階の高さの範囲（基準の高さ〜天端）に入る。
// 仕様 K6: 境界が無ければ、食い込みも斜線の面も無い。
import { describe, expect, it } from 'vitest'
import type { Point } from '../geom/viewport'
import { cutFootprint, removedPiecesOf, type SlopeBoundary } from './slope'
import { overrunFloorsOf, slopeLimitMm, slopeSheetsOf } from './slopeSurface'

// 20 m 角の外形（mm）。西の辺（x = 0）が道路の境界（内側は +x）
const SQUARE: Point[] = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 20_000 },
  { x: 0, y: 20_000 },
]
const ROAD: SlopeBoundary = {
  point: { x: 0, y: 0 },
  inward: { x: 1, y: 0 },
  coefficient: 1.25,
  riseMm: 0,
  maxDistanceMm: 20_000,
  kind: 'road',
}
const area = (poly: readonly Point[]) => Math.abs(poly.reduce((s, p, i) => s + p.x * poly[(i + 1) % poly.length]!.y - poly[(i + 1) % poly.length]!.x * p.y, 0)) / 2
const polyArea = (pieces: readonly (readonly Point[])[]) => pieces.reduce((s, p) => s + area(p), 0)

describe('斜線の上限の高さ（仕様 K1）', () => {
  it('仕様 K1: 距離 d で rise + coef × d。距離の上限以上は無限', () => {
    expect(slopeLimitMm(ROAD, 10_000)).toBeCloseTo(12_500, 9)
    expect(slopeLimitMm(ROAD, 20_000)).toBe(Infinity)
    const adjacent: SlopeBoundary = { ...ROAD, maxDistanceMm: undefined, kind: 'adjacent', riseMm: 3000, coefficient: 1.25 }
    expect(slopeLimitMm(adjacent, 20_000)).toBeCloseTo(28_000, 9)
  })
})

describe('切り取られた部分（食い込み）（仕様 K2・K3）', () => {
  it('仕様 K2: 天端 15 m なら、境界から 12 m（15 ÷ 1.25）が切られる。切られた部分の面積は 240 m²', () => {
    const pieces = removedPiecesOf(SQUARE, [ROAD], 15_000)
    expect(polyArea(pieces)).toBeCloseTo(12_000 * 20_000, 0)
  })

  it('仕様 K2: 切られた部分と切り取り後の面積の和は、外形の面積に一致する', () => {
    const pieces = removedPiecesOf(SQUARE, [ROAD], 15_000)
    const kept = cutFootprint(SQUARE, [ROAD], 15_000)
    expect(polyArea(pieces) + area(kept)).toBeCloseTo(area(SQUARE), 0)
  })

  it('仕様 K3: 天端が立ち上がり以下なら、切られた部分は無い', () => {
    const pieces = removedPiecesOf(SQUARE, [{ ...ROAD, riseMm: 16_000 }], 15_000)
    expect(pieces).toEqual([])
  })
})

describe('斜線の面（仕様 K4）', () => {
  it('仕様 K4: 境界の線上で高さ rise、距離 D で rise + coef × D。四隅を持つ', () => {
    const sheets = slopeSheetsOf([ROAD], 30_000)
    expect(sheets).toHaveLength(1)
    const quad = sheets[0]!
    expect(quad).toHaveLength(4)
    const low = quad.filter((v) => Math.abs(v.hMm - 0) < 1e-9)
    const high = quad.filter((v) => Math.abs(v.hMm - 25_000) < 1e-9)
    expect(low).toHaveLength(2)
    expect(high).toHaveLength(2)
    // 高い側の二点は、境界から距離 D（maxDistance 20 m）の線上（x = 20 m）
    for (const v of high) expect(v.x).toBeCloseTo(20_000, 6)
    for (const v of low) expect(v.x).toBeCloseTo(0, 6)
  })
})

describe('階ごとの食い込み（仕様 K5・K6）', () => {
  it('仕様 K5: 階 1（天端 10 m）は 8 m、階 2（天端 20 m）は 16 m が切られる。階の高さの範囲に入る', () => {
    const floors = overrunFloorsOf(SQUARE, [ROAD], { storey_count: 2, storey_height: 10_000 })
    expect(floors).toHaveLength(2)
    expect(floors[0]!.baseMm).toBe(0)
    expect(floors[0]!.topMm).toBe(10_000)
    expect(polyArea(floors[0]!.pieces)).toBeCloseTo(8_000 * 20_000, 0)
    expect(floors[1]!.baseMm).toBe(10_000)
    expect(floors[1]!.topMm).toBe(20_000)
    expect(polyArea(floors[1]!.pieces)).toBeCloseTo(16_000 * 20_000, 0)
  })

  it('仕様 K6: 境界が無ければ、食い込みも斜線の面も無い', () => {
    const floors = overrunFloorsOf(SQUARE, [], { storey_count: 2, storey_height: 10_000 })
    expect(floors.every((f) => f.pieces.length === 0)).toBe(true)
    expect(slopeSheetsOf([], 30_000)).toEqual([])
  })
})

// 5a の確かめ直し（統括の依頼 2026-11-06）: 外形を開発用のダミー筆界（20 m × 30 m。南の辺が前面道路）に重ねて、
// 用途地域「住居系」・前面道路の幅員 6 m・高さ 15 m（5 階 × 3 m）。道路斜線の式: 1.25 × (6 m + 道路境界からの距離 y) = 階の天端 z で、
// 建物の南の辺から y = z ÷ 1.25 − 6 m の帯が切られる。隣地（立ち上がり 20 m）と北側（住居系は対象外）は、高さ 15 m では切らない。
import { legalBoundaries } from './legalSlope'
import { DUMMY_PARCEL } from '../plan/dummyParcel'

describe('5a の確かめ: 住居系・前面道路 6 m・高さ 15 m（外形 = ダミー筆界）', () => {
  const legal = legalBoundaries({ footprint: DUMMY_PARCEL, roadEdgeIndex: 0, roadWidthMm: 6_000, zone: '住居系', farPercent: 200 })

  it('道路斜線は 1 本（係数 1.25、距離 20 m、南の辺の外 6 m）。北側は作らない', () => {
    const road = legal.boundaries.filter((b) => b.kind === 'road')
    expect(road).toHaveLength(1)
    expect(road[0]!.coefficient).toBe(1.25)
    expect(road[0]!.maxDistanceMm).toBe(20_000)
    expect(road[0]!.point.y).toBeCloseTo(-6_000, 6)
    expect(legal.boundaries.some((b) => b.kind === 'north')).toBe(false)
  })

  it('階ごとに切られる帯の幅: 天端 9 m は 1.2 m、12 m は 3.6 m、15 m は 6.0 m（20 m の辺にわたる。面積 24・72・120 m²）', () => {
    const floors = overrunFloorsOf(DUMMY_PARCEL, legal.boundaries, { storey_count: 5, storey_height: 3_000 })
    const areas = floors.map((f) => polyArea(f.pieces))
    expect(areas[0]).toBeCloseTo(0, 0)
    expect(areas[1]).toBeCloseTo(0, 0)
    expect(areas[2]).toBeCloseTo(24e6, -3)
    expect(areas[3]).toBeCloseTo(72e6, -3)
    expect(areas[4]).toBeCloseTo(120e6, -3)
  })

  it('高さ 15 m で切られるのは道路斜線の帯（6 m × 20 m）だけ。隣地は切らない（全体 = 120 m²）', () => {
    const pieces = removedPiecesOf(DUMMY_PARCEL, legal.boundaries, 15_000)
    expect(polyArea(pieces)).toBeCloseTo(120e6, -3)
    // 切られた部分の一つ一つが、南の辺（y = 0）から 6 m の帯の中にある
    for (const piece of pieces) for (const p of piece) expect(p.y).toBeLessThanOrEqual(6_000 + 1e-6)
  })
})
