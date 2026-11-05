// 仕様（統括の依頼 2026-11-06。1: 確定の敷地は、選んだ筆の UID と筆の形から作る）:
// 仕様 1i: 筆を選ぶと、店舗は選んだ筆の UID を持つ。含む筆が無いときは null。
// 仕様 1j: 覚えた筆の形は、UID から取り出せる。覚えていない UID は undefined。
import { beforeEach, describe, expect, it } from 'vitest'
import { useSite } from '../store/site'
import { geometryOfParcel, publishSelectedParcel, rememberParcelGeometry } from './selectedParcel'

const SQUARE = { type: 'Polygon', coordinates: [[[139.8, 35.6], [139.801, 35.6], [139.801, 35.601], [139.8, 35.6]]] }

beforeEach(() => useSite.setState({ parcel: null, parcelInfo: null, parcelUid: null }))

describe('選んだ筆の UID（仕様 1i・1j）', () => {
  it('仕様 1i: 筆を選ぶと店舗は UID を持つ。含む筆が無ければ null', () => {
    rememberParcelGeometry('筆U', SQUARE, { 地番: '1' })
    publishSelectedParcel('筆U')
    expect(useSite.getState().parcelUid).toBe('筆U')
    publishSelectedParcel(null)
    expect(useSite.getState().parcelUid).toBeNull()
  })

  it('仕様 1j: 覚えた筆の形は UID から取り出せる。覚えていない UID は undefined', () => {
    rememberParcelGeometry('筆V', SQUARE)
    expect(geometryOfParcel('筆V')).toBe(SQUARE)
    expect(geometryOfParcel('無い')).toBeUndefined()
  })
})
