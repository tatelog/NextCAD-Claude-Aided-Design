// 仕様（統括の依頼 2026-11-06。P2 の斜線の基準を、P1 で選んだ筆に替える。2 件目の前段: 店舗に筆を持つ）:
// 仕様 8（初めは無い）: 店舗の筆は最初は null（筆を選んでいない・筆のファイルが無い）。
// 仕様 9（入れて読める）: 筆の平面を入れると、同じ平面を読める。null に戻すと、筆を選んでいない状態に戻る。
import { describe, expect, it } from 'vitest'
import { useSite } from './site'

const ring = [
  { x: -10_000, y: -15_000 },
  { x: 10_000, y: -15_000 },
  { x: 10_000, y: 15_000 },
  { x: -10_000, y: 15_000 },
]

describe('店舗の筆（仕様 8・9）', () => {
  it('仕様 8: 最初は筆が無い（初期値が null）', () => {
    expect(useSite.getInitialState().parcel).toBeNull()
  })

  it('仕様 9: 入れた平面を読める。null に戻すと、筆を選んでいない状態に戻る', () => {
    useSite.setState({ parcel: null })
    useSite.getState().setParcel(ring)
    expect(useSite.getState().parcel).toEqual(ring)
    useSite.getState().setParcel(null)
    expect(useSite.getState().parcel).toBeNull()
  })
})
