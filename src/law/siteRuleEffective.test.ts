// 仕様（統括の依頼 2026-11-06。日影の通し: 日影の判定も、PLATEAU の区分（選んだ筆の用途地域）を使う。手入力の区分は使わない）:
// EZ1: PLATEAU の区分が決まっていれば、計算の区分はその区分（手入力より優先）。
// EZ2: PLATEAU の区分が決まらなければ、手入力の区分を使う。
// EZ3: 625-1（準工）の日影は、手入力の住居系ではなく PLATEAU の準工で判定する（準工の理由の文になる）。
import { describe, expect, it } from 'vitest'
import { effectiveZoneOf } from './siteRule'
import { shadowRuleFromOrdinance, SHADOW_KEYS } from './shadowOrdinance'
import type { OrdinanceEntry } from './ordinance'

const confirmedAll: OrdinanceEntry[] = [
  { key: SHADOW_KEYS.near, value: '4時間', source: '東京都条例 別表', confirmed: true },
  { key: SHADOW_KEYS.far, value: '2.5時間', source: '東京都条例 別表', confirmed: true },
  { key: SHADOW_KEYS.height, value: '4 m', source: '東京都条例 別表', confirmed: true },
]

describe('計算の区分（仕様 EZ1〜EZ3）', () => {
  it('EZ1: PLATEAU の区分が決まっていれば、それを使う（手入力より優先）', () => {
    expect(effectiveZoneOf({ zone: '準工・工業系', farPercent: 200 }, '住居系')).toBe('準工・工業系')
  })

  it('EZ2: PLATEAU の区分が決まらなければ、手入力の区分を使う', () => {
    expect(effectiveZoneOf(null, '住居系')).toBe('住居系')
  })

  it('EZ3: 日影は、手入力の住居系ではなく PLATEAU の準工で判定する（準工業の理由の文になる）', () => {
    const r = shadowRuleFromOrdinance(effectiveZoneOf({ zone: '準工・工業系', farPercent: 200 }, '住居系'), confirmedAll)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toContain('準工業は日影の対象')
  })
})
