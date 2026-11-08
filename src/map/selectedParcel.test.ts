// 仕様（統括の依頼 2026-11-06。P2 の斜線の基準を、P1 で選んだ筆に替える）:
// 仕様 10: 地図の筆の形を覚えておき、選んだ筆の平面を店舗へ渡す（P2 が読む）。
// 仕様 11: 覚えていない筆、または筆を選び直せないとき（null）は、店舗の筆を null にする（P2 はダミーの筆に戻す）。
// 仕様 12: 同じ筆の形を覚え直したら、次に渡すときは新しい形を渡す。
import { beforeEach, describe, expect, it } from 'vitest'
import { useSite } from '../store/site'
import { publishSelectedParcel, rememberParcelGeometry } from './selectedParcel'

const LON0 = 139.86
const LAT0 = 35.68
const square = (side: number) => ({
  type: 'Polygon',
  coordinates: [[
    [LON0, LAT0],
    [LON0 + side, LAT0],
    [LON0 + side, LAT0 + side],
    [LON0, LAT0 + side],
    [LON0, LAT0],
  ]],
})

beforeEach(() => useSite.setState({ parcel: null }))

describe('選んだ筆の平面を店舗へ渡す（仕様 10〜12）', () => {
  it('仕様 10: 覚えた筆を選ぶと、その平面（4 頂点）が店舗に入る', () => {
    rememberParcelGeometry('筆A', square(0.0001))
    publishSelectedParcel('筆A')
    const parcel = useSite.getState().parcel
    expect(parcel).not.toBeNull()
    expect(parcel).toHaveLength(4)
  })

  it('仕様 11: 覚えていない筆、または null を渡すと、店舗の筆は null になる', () => {
    rememberParcelGeometry('筆A', square(0.0001))
    publishSelectedParcel('筆A')
    publishSelectedParcel('覚えていない筆')
    expect(useSite.getState().parcel).toBeNull()
    publishSelectedParcel('筆A')
    publishSelectedParcel(null)
    expect(useSite.getState().parcel).toBeNull()
  })

  it('仕様 12: 同じ筆の形を覚え直すと、次に渡すときは新しい形になる', () => {
    rememberParcelGeometry('筆B', square(0.0001))
    publishSelectedParcel('筆B')
    const small = useSite.getState().parcel!
    rememberParcelGeometry('筆B', square(0.0002))
    publishSelectedParcel('筆B')
    const large = useSite.getState().parcel!
    const span = (ring: { x: number }[]) => Math.max(...ring.map((p) => p.x)) - Math.min(...ring.map((p) => p.x))
    expect(span(large)).toBeGreaterThan(span(small))
  })
})
