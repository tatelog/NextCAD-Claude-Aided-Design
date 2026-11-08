// 仕様（統括の依頼 2026-11-05、t34。江東区の日影の一覧 src/law/shadowOrdinanceKoto.json、区訂正図 t23）:
// 仕様 1（K1・K2）: 区の訂正図と食い違う K1（平野一丁目・深川二丁目）と K2（東陽五丁目）は、値を確定扱いにせず「要確認」。
// 仕様 2（町丁目名だけの区域）: 地番の範囲が未確認の町丁目の区域は、全域へ広げず「要確認」。
// 仕様 3（区域外）: 一覧に当たらない丁目は、江東区の全域の規定を使う。
// 仕様 4（丁目が未確認）: 丁目が分からないときは「丁目が未確認」（区域に当たるかを確かめられない）。要確認として返す。
import { describe, expect, it } from 'vitest'
import { koutoAreaOf } from './shadowKotoAreas'

describe('K1・K2（仕様 1）', () => {
  it('平野一丁目・深川二丁目（K1）と東陽五丁目（K2）は要確認。確定扱いにしない', () => {
    expect(koutoAreaOf('平野一丁目')).toMatchObject({ kind: 'confirm', ref: 'K1' })
    expect(koutoAreaOf('深川二丁目')).toMatchObject({ kind: 'confirm', ref: 'K1' })
    expect(koutoAreaOf('東陽五丁目')).toMatchObject({ kind: 'confirm', ref: 'K2' })
  })
})

describe('町丁目名だけの区域（仕様 2）', () => {
  it('地番の範囲が未確認の町丁目は、全域へ広げず要確認（kind は town-only）', () => {
    // 区域の id は JSON のとおり（別表三22 は K1-別表三22、除外の別表二17 は R-別表二17）。ここでは扱いの種類を確かめる
    expect(koutoAreaOf('清澄一丁目')).toMatchObject({ kind: 'town-only' })
    expect(koutoAreaOf('三好三丁目')).toMatchObject({ kind: 'town-only', ref: 'R-別表二17' })
  })
})

describe('区域外（仕様 3）', () => {
  it('一覧に当たらない丁目は、江東区の全域の規定（general）', () => {
    expect(koutoAreaOf('東雲一丁目')).toMatchObject({ kind: 'general' })
  })
})

describe('丁目が未確認（仕様 4）', () => {
  it('丁目が無いときは unknown（要確認として返す）', () => {
    expect(koutoAreaOf(null)).toMatchObject({ kind: 'unknown' })
    expect(koutoAreaOf('  ')).toMatchObject({ kind: 'unknown' })
  })
})
