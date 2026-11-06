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

/**
 * 用途地域の欄の表示（統括の依頼 2026-11-06）。PLATEAU（敷地）で区分が決まっていれば、計算はその区分を使うので、欄はその区分を示して押せないようにする。
 * 決まらなければ、利用者の入力を示して押せる。
 */
export function zoneSelectStateOf(siteRule: { zone: Zone; farPercent: number | null } | null, manual: Zone): { value: Zone; disabled: boolean } {
  return siteRule ? { value: siteRule.zone, disabled: true } : { value: manual, disabled: false }
}
