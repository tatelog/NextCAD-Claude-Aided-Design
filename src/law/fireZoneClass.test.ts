// 仕様（ハブ A-03 G28・D-02 C11。出典: 建築基準法施行令 第136条の2 第1項（325CO0000000338）を 2026-11-04 に e-Gov の本文で確認。数値条件は各号の柱書の区分）:
// 防火地域・準防火地域の建物は、階数（地階を除く）と延べ面積から、令 136 条の 2 第 1 項の号を決める。号の中身（構造・性能の基準）は別の条を参照するので、ここでは判定しない。
// 防火地域: 第一号 = 階数 3 以上 または 延べ面積 100 ㎡超。第二号 = 階数 2 以下 かつ 延べ面積 100 ㎡以下。
// 準防火地域: 第一号 = 階数 4 以上 または 延べ面積 1500 ㎡超。第二号 = 階数 3 かつ 延べ面積 1500 ㎡以下、または 階数 2 以下 かつ 延べ面積 500 ㎡超 1500 ㎡以下。
//   第三号 = 階数 2 以下 かつ 延べ面積 500 ㎡以下 の木造建築物等。第四号 = 同じ規模で木造建築物等以外。
// 仕様 1: 防火地域で、階数 3 以上 または 延べ面積 100 ㎡超なら 第一号、そうでなければ 第二号。
// 仕様 2: 準防火地域は、階数・面積の区分ごとに 第一号〜第四号のいずれか。
// 仕様 3: 防火地域・準防火地域の外（区域の指定なし）は「対象外」。
// 仕様 4: 同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { fireZoneClass } from './fireZoneClass'

describe('令 136 条の 2 第 1 項の号（仕様 1〜4）', () => {
  it('仕様 1: 防火地域は、階数 3 以上 または 延べ面積 100 ㎡超で 第一号、それ以外は 第二号', () => {
    expect(fireZoneClass({ zone: '防火', aboveGroundStoreys: 3, floorAreaM2: 300, wood: false })).toBe('第一号')
    expect(fireZoneClass({ zone: '防火', aboveGroundStoreys: 1, floorAreaM2: 120, wood: false })).toBe('第一号')
    expect(fireZoneClass({ zone: '防火', aboveGroundStoreys: 2, floorAreaM2: 100, wood: false })).toBe('第二号')
  })

  it('仕様 2: 準防火地域は、階数・面積の区分ごとに第一号〜第四号', () => {
    expect(fireZoneClass({ zone: '準防火', aboveGroundStoreys: 4, floorAreaM2: 800, wood: false })).toBe('第一号')
    expect(fireZoneClass({ zone: '準防火', aboveGroundStoreys: 3, floorAreaM2: 1200, wood: false })).toBe('第二号')
    expect(fireZoneClass({ zone: '準防火', aboveGroundStoreys: 2, floorAreaM2: 800, wood: false })).toBe('第二号')
    expect(fireZoneClass({ zone: '準防火', aboveGroundStoreys: 2, floorAreaM2: 400, wood: true })).toBe('第三号')
    expect(fireZoneClass({ zone: '準防火', aboveGroundStoreys: 2, floorAreaM2: 400, wood: false })).toBe('第四号')
  })

  it('仕様 3: 指定なしは対象外', () => {
    expect(fireZoneClass({ zone: 'なし', aboveGroundStoreys: 5, floorAreaM2: 2000, wood: false })).toBe('対象外')
  })

  it('仕様 4: 同じ入力には同じ出力', () => {
    const input = { zone: '防火' as const, aboveGroundStoreys: 3, floorAreaM2: 300, wood: false }
    expect(fireZoneClass(input)).toBe(fireZoneClass(input))
  })
})
