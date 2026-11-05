// 仕様（統括の依頼 2026-11-06。3 件目: 使われなくなった DUMMY_SITE_MM を消す）:
// 仕様 30: 描画の店舗（store/drawing）は、ダミーの筆界（DUMMY_SITE_MM）を持たない。ダミーの敷地は plan/dummyParcel の DUMMY_PARCEL だけ。
// 仕様 31: ダミーの敷地（DUMMY_PARCEL）は 20 m × 30 m の矩形で、面積は 600 m²。
import { describe, expect, it } from 'vitest'
import { DUMMY_PARCEL } from '../plan/dummyParcel'
import { lotAreaMm2 } from '../plan/lot'
import * as drawing from './drawing'

describe('ダミーの敷地は一つ（仕様 30・31）', () => {
  it('仕様 30: 描画の店舗は、ダミーの筆界（DUMMY_SITE_MM）を持たない', () => {
    expect('DUMMY_SITE_MM' in drawing).toBe(false)
  })

  it('仕様 31: ダミーの敷地は 20 m × 30 m の矩形で、面積は 600 m²', () => {
    expect(DUMMY_PARCEL).toHaveLength(4)
    expect(lotAreaMm2(DUMMY_PARCEL)).toBe(600_000_000)
  })
})
