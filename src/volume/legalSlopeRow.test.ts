// 仕様（統括の指示 2026-11-06。斜線の欄の小さい直し）: 境界が一つも作られないとき、斜線の欄に「判定する規則が無い」ではなく、理由を出す。
// 理由は、欄の下の「判定不能」の行と同じ元（legal.pending）から作る（文言を二重に持たない）。
// 仕様 SF1: 容積率の上限が無いときは、境界を作らず、未判定に「容積率の上限が未入力（道路斜線の適用距離が決まらない）」を積む。
// 仕様 SF2: 欄の理由は、その未判定の文言（北側斜線の未判定は、欄の下に別に出すので外す）。
// 仕様 SF3: 境界が作られるときは、欄に理由を出さない（判定の結果を出す）。
import { describe, expect, it } from 'vitest'
import { DUMMY_PARCEL } from '../plan/dummyParcel'
import { FAR_LIMIT_PENDING, legalSlopeFromInputs, slopeRowReasonOf } from './legalSlope'

const BASE = { footprint: DUMMY_PARCEL, roadEdgeIndex: 0, roadWidthMm: 6_000 }

describe('容積率の上限が無いとき（仕様 SF1・SF2）', () => {
  it('仕様 SF1: 容積率の上限が無いと、境界は作らず、未判定に理由を積む', () => {
    const legal = legalSlopeFromInputs({ ...BASE, zone: '住居系', farPercent: null })
    expect(legal.boundaries).toEqual([])
    expect(legal.pending).toEqual([FAR_LIMIT_PENDING])
    expect(FAR_LIMIT_PENDING).toContain('道路斜線の適用距離が決まらない')
  })

  it('仕様 SF2: 欄の理由は、その未判定の文言と同じ', () => {
    const legal = legalSlopeFromInputs({ ...BASE, zone: '住居系', farPercent: null })
    expect(slopeRowReasonOf(legal)).toBe(FAR_LIMIT_PENDING)
  })
})

describe('境界があるとき（仕様 SF3）', () => {
  it('仕様 SF3: 境界が作られるときは、欄に理由を出さない（判定の結果を出す）', () => {
    const legal = legalSlopeFromInputs({ ...BASE, zone: '住居系', farPercent: 200 })
    expect(legal.boundaries.length).toBeGreaterThan(0)
    expect(legal.pending).toEqual([])
  })
})
