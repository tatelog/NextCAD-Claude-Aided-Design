// 仕様（統括の依頼 2026-11-06。P1 の「選んだ筆」の表示を、店舗の選択に合わせる）:
// 仕様 32: 筆を選ぶと、店舗の「選んだ筆の情報の文」はその筆の情報（地番・地域・精度区分・地図名）になる。
// 仕様 33: 地点を含む筆が無いときは、店舗の情報の文は「この地点を含む筆は無い（ボリュームはダミーの筆界）」になる。
// 仕様 34: 選び直すと、情報の文も選び直した筆のものになる（前の筆の文は残らない）。
// 仕様 35: 筆の情報を覚えていない筆（UID 不明）を選んだときは、含む筆が無いときと同じ文になる。
import { beforeEach, describe, expect, it } from 'vitest'
import { useSite } from '../store/site'
import { publishSelectedParcel, rememberParcelGeometry } from './selectedParcel'

const square = (x0: number, y0: number, side: number) => ({
  type: 'Polygon',
  coordinates: [[[x0, y0], [x0 + side, y0], [x0 + side, y0 + side], [x0, y0 + side], [x0, y0]]],
})

const NONE = 'この地点を含む筆は無い（ボリュームはダミーの筆界）'

beforeEach(() => useSite.setState({ parcel: null, parcelInfo: null }))

describe('「選んだ筆」の表示は店舗の選択に合わせる（仕様 32〜35）', () => {
  it('仕様 32: 筆を選ぶと、その筆の情報の文が店舗に入る', () => {
    rememberParcelGeometry('筆I', square(139.8, 35.65, 0.001), {
      地番: '2-7',
      大字名: '新砂',
      丁目名: '３丁目',
      精度区分: '',
      地図名: 'テスト地図',
    })
    publishSelectedParcel('筆I')
    expect(useSite.getState().parcelInfo).toBe('選択した筆：地番 2-7（新砂３丁目）、精度区分 不明、地図名 テスト地図')
  })

  it('仕様 33: 含む筆が無い（null）ときは、「この地点を含む筆は無い（ボリュームはダミーの筆界）」になる', () => {
    publishSelectedParcel(null)
    expect(useSite.getState().parcelInfo).toBe(NONE)
  })

  it('仕様 34: 選び直すと、情報の文も選び直した筆のものになる', () => {
    rememberParcelGeometry('筆J', square(139.9, 35.6, 0.001), { 地番: '1', 大字名: '東陽', 丁目名: '１丁目', 精度区分: '甲', 地図名: '地図J' })
    publishSelectedParcel('筆I')
    publishSelectedParcel('筆J')
    expect(useSite.getState().parcelInfo).toBe('選択した筆：地番 1（東陽１丁目）、精度区分 甲、地図名 地図J')
    publishSelectedParcel(null)
    expect(useSite.getState().parcelInfo).toBe(NONE)
  })

  it('仕様 35: 覚えていない筆（UID 不明）を選んだときは、含む筆が無いときと同じ文になる', () => {
    publishSelectedParcel('覚えていない筆')
    expect(useSite.getState().parcelInfo).toBe(NONE)
  })
})
