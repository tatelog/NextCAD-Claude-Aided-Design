// 仕様（統括の指示 2026-11-06。5c: 北側斜線に真北を渡す。真北が分からないときは未判定と出す）:
// 仕様 NN1: 真北を傾けると、北と判定する辺（真北の向きに最も出ている頂点）が変わる。
// 仕様 NN2: 真北が分からない（trueNorth を渡さない）ときは、北側斜線を作らず、「北側斜線（真北が分からないので未判定）」を未判定に積む。
// 仕様 NN3: 北側斜線の規則が対象外（住居系）なら、真北が分からなくても未判定には積まない。
import { describe, expect, it } from 'vitest'
import { DUMMY_PARCEL } from '../plan/dummyParcel'
import { legalBoundaries } from './legalSlope'

const BASE = { footprint: DUMMY_PARCEL, roadEdgeIndex: 0, roadWidthMm: 6_000, farPercent: 100 }

describe('北側斜線の向き（仕様 NN1）', () => {
  it('仕様 NN1: 真北が東（+x）を向くとき、北の辺は東の辺（x が最も大きい頂点の側）になる', () => {
    const legal = legalBoundaries({ ...BASE, zone: '低層住専', trueNorth: { x: 1, y: 0 } })
    const north = legal.boundaries.filter((b) => b.kind === 'north')
    expect(north).toHaveLength(1)
    expect(north[0]!.point.x).toBeCloseTo(20_000, 6)
    expect(north[0]!.inward.x).toBeCloseTo(-1, 9)
    expect(north[0]!.inward.y).toBeCloseTo(0, 9)
  })

  it('仕様 NN1: 真北が北東を向くとき（斜め）は、北東の頂点（x と y が最も大きい）が北の辺の点になる', () => {
    const s = Math.SQRT1_2
    const legal = legalBoundaries({ ...BASE, zone: '低層住専', trueNorth: { x: s, y: s } })
    const north = legal.boundaries.filter((b) => b.kind === 'north')
    expect(north).toHaveLength(1)
    expect(north[0]!.point.x).toBeCloseTo(20_000, 6)
    expect(north[0]!.point.y).toBeCloseTo(30_000, 6)
  })
})

describe('真北が分からないとき（仕様 NN2・NN3）', () => {
  it('仕様 NN2: 真北が無いと、北側斜線は作らず、未判定に「北側斜線（真北が分からないので未判定）」を積む', () => {
    const legal = legalBoundaries({ ...BASE, zone: '低層住専' })
    expect(legal.boundaries.some((b) => b.kind === 'north')).toBe(false)
    expect(legal.pending.some((p) => p.includes('北側斜線') && p.includes('真北が分からない'))).toBe(true)
  })

  it('仕様 NN3: 住居系は北側斜線の規則が対象外なので、真北が無くても未判定には積まない', () => {
    const legal = legalBoundaries({ ...BASE, zone: '住居系' })
    expect(legal.pending.some((p) => p.includes('北側斜線'))).toBe(false)
  })
})
