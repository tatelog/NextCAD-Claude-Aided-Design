// P1 で取った用途地域（PLATEAU）から、P2 の斜線の区分と容積率の限度を決める（D-02 C4・C5、G15・G28）。
// 一つに決まるときだけ使う。決まらなければ null（利用者の入力に任せる）。
import type { UseDistrict } from '../plateau/urf'
import { zoneFromUrfFunction } from './zoneCode'
import type { Zone } from './slopeRules'

export function siteRuleFromDistricts(matches: readonly UseDistrict[]): { zone: Zone; farPercent: number | null } | null {
  if (matches.length !== 1) return null
  const m = matches[0]!
  if (m.function === null) return null
  return { zone: zoneFromUrfFunction(m.function), farPercent: m.floorAreaRatePercent }
}
