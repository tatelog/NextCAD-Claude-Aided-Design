// 仕様（P1 の地図の入力の検査。代表の依頼「拡大縮小・対象案件の選択」）:
// 仕様 1: 拡大縮小は整数の 0〜18。範囲外は端に寄せる。数でない値は 0。
// 仕様 7: 経緯度の入力は、空・数でない・範囲外なら対象地点にしない（null）。
// 仕様 8: 同じ入力には同じ出力。
// 仕様 2〜6・9（中心の置き方・タイル・パン・クリックとドラッグ・ホイール）は、地図を MapLibre に移したため外した（t85）。
import { describe, expect, it } from 'vitest'
import { MAX_ZOOM, clampZoom, parseSitePoint } from './viewport'

describe('ズームの範囲（仕様 1）', () => {
  it('整数の 0〜18 に収め、範囲外は端に寄せる', () => {
    expect(MAX_ZOOM).toBe(18)
    expect(clampZoom(15.7)).toBe(15)
    expect(clampZoom(-3)).toBe(0)
    expect(clampZoom(25)).toBe(18)
  })

  it('数でない値は 0', () => {
    expect(clampZoom(Number.NaN)).toBe(0)
  })
})

describe('経緯度の入力（仕様 7）', () => {
  it('数の入力は経緯度にする', () => {
    expect(parseSitePoint('139.814', '35.67')).toEqual({ lon: 139.814, lat: 35.67 })
  })

  it('空・数でない・範囲外は null', () => {
    expect(parseSitePoint('', '35.67')).toBeNull()
    expect(parseSitePoint('139.8', '')).toBeNull()
    expect(parseSitePoint('abc', '35')).toBeNull()
    expect(parseSitePoint('200', '35')).toBeNull()
    expect(parseSitePoint('139', '91')).toBeNull()
  })
})

describe('同じ入力には同じ出力（仕様 8）', () => {
  it('ズームの検査と経緯度の入力は、同じ入力で同じ結果になる', () => {
    expect(clampZoom(15.7)).toBe(clampZoom(15.7))
    expect(parseSitePoint('139.814', '35.67')).toEqual(parseSitePoint('139.814', '35.67'))
  })
})
