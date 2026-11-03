// 仕様: P1 で取った用途地域（PLATEAU）から、P2 の斜線の区分と容積率の限度を決める（D-02 C4・C5、G15・G28）。
// 仕様 1: 地点を含む用途地域が一つで、区分コードがあるときだけ、区分と容積率（％）を使う。
// 仕様 2: 用途地域が無い・二つ以上ある（境界や重なり）ときは、決めない（null。利用者の入力に任せる）。
// 仕様 3: 区分コードが無いときは決めない（null）。容積率が無いときは、区分だけ決め、容積率は null（推測で埋めない）。
import { describe, expect, it } from 'vitest'
import { siteRuleFromDistricts } from './siteRule'
import type { UseDistrict } from '../plateau/urf'

function d(function_: number | null, far: number | null): UseDistrict {
  return {
    id: 'x',
    function: function_,
    floorAreaRatePercent: far,
    buildingCoverageRatePercent: null,
    heightLimitM: null,
    notificationNumber: null,
    ring: [],
  }
}

describe('siteRuleFromDistricts', () => {
  it('一つに決まれば、区分と容積率の限度を返す', () => {
    expect(siteRuleFromDistricts([d(5, 300)])).toEqual({ zone: '住居系', farPercent: 300 })
  })

  it('用途地域が無い・二つ以上なら決めない', () => {
    expect(siteRuleFromDistricts([])).toBeNull()
    expect(siteRuleFromDistricts([d(5, 300), d(9, 400)])).toBeNull()
  })

  it('区分コードが無ければ決めない', () => {
    expect(siteRuleFromDistricts([d(null, 300)])).toBeNull()
  })

  it('容積率が無ければ区分だけ決め、容積率は null', () => {
    expect(siteRuleFromDistricts([d(9, null)])).toEqual({ zone: '商業系', farPercent: null })
  })
})
