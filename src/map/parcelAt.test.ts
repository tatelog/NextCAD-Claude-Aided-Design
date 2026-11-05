// 仕様（統括の依頼 2026-11-06。2 件目: 住所で探した地点の筆も、地図の地点と同じく、地点を含む筆を選ぶ）:
// 仕様 25: 地点（経度・緯度）を含む筆の UID を返す（Polygon）。
// 仕様 26: 地点がどの筆にも入らないときは null。
// 仕様 27: MultiPolygon は、どれかの部分に入る地点を、その筆として返す。
// 仕様 28: 穴（内側の輪）の中の地点は、その筆の外として扱う（null）。
// 仕様 29: 地点から選ぶと、店舗の筆はその筆の平面になる。地点を含む筆が無ければ、店舗の筆は null（P2 はダミーに戻す）。
import { beforeEach, describe, expect, it } from 'vitest'
import { useSite } from '../store/site'
import { parcelUidAt, rememberParcelGeometry, selectParcelAt } from './selectedParcel'

const square = (x0: number, y0: number, side: number) => [
  [x0, y0],
  [x0 + side, y0],
  [x0 + side, y0 + side],
  [x0, y0 + side],
  [x0, y0],
]

beforeEach(() => useSite.setState({ parcel: null }))

describe('地点を含む筆（仕様 25〜29）', () => {
  it('仕様 25: 地点を含む Polygon の筆の UID を返す', () => {
    rememberParcelGeometry('筆P', { type: 'Polygon', coordinates: [square(139.83, 35.67, 0.001)] })
    expect(parcelUidAt(139.8305, 35.6705)).toBe('筆P')
  })

  it('仕様 26: どの筆にも入らない地点は null', () => {
    rememberParcelGeometry('筆Q', { type: 'Polygon', coordinates: [square(139.83, 35.67, 0.001)] })
    expect(parcelUidAt(139.9, 35.7)).toBeNull()
  })

  it('仕様 27: MultiPolygon は、どれかの部分に入る地点をその筆として返す', () => {
    rememberParcelGeometry('筆M', {
      type: 'MultiPolygon',
      coordinates: [[square(139.87, 35.67, 0.0005)], [square(139.875, 35.67, 0.0005)]],
    })
    expect(parcelUidAt(139.8752, 35.67025)).toBe('筆M')
  })

  it('仕様 28: 穴の中の地点は、その筆の外（null）。穴の外で外側の輪の中なら筆に入る', () => {
    rememberParcelGeometry('筆H', {
      type: 'Polygon',
      coordinates: [square(139.85, 35.67, 0.001), square(139.8502, 35.6702, 0.0006)],
    })
    expect(parcelUidAt(139.8505, 35.6705)).toBeNull()
    expect(parcelUidAt(139.8501, 35.6705)).toBe('筆H')
  })

  it('仕様 29: 地点から選ぶと、店舗の筆はその平面になる。含む筆が無ければ null', () => {
    rememberParcelGeometry('筆R', { type: 'Polygon', coordinates: [square(139.8, 35.65, 0.001)] })
    expect(selectParcelAt(139.8005, 35.6505)).toBe('筆R')
    expect(useSite.getState().parcel).toHaveLength(4)
    expect(selectParcelAt(139.9, 35.7)).toBeNull()
    expect(useSite.getState().parcel).toBeNull()
  })
})
