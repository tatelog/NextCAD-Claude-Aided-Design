// 仕様（統括の依頼 2026-11-06。日影の通し: 625-1 は準工業で、日影規制の対象かどうかの扱いを確かめる）:
// SJ1: 準工・工業系は、条例の値が揃っていても判定しない（ok: false）。
// SJ2: 理由は「対象外」とは言わない。準工業は別表第四の対象（三項。高さ 10 m 超）、工業・工業専用は対象外。
//      アプリは両者を一つの区分にまとめているので、判定しないと言う。
// SJ3: 住居系は従来どおり、確認済みの条例の値で判定に使う（変えない）。
import { describe, expect, it } from 'vitest'
import { shadowRuleFromOrdinance, SHADOW_KEYS } from './shadowOrdinance'
import type { OrdinanceEntry } from './ordinance'

const confirmedAll: OrdinanceEntry[] = [
  { key: SHADOW_KEYS.near, value: '4時間', source: '東京都条例 別表', confirmed: true },
  { key: SHADOW_KEYS.far, value: '2.5時間', source: '東京都条例 別表', confirmed: true },
  { key: SHADOW_KEYS.height, value: '4 m', source: '東京都条例 別表', confirmed: true },
]

describe('準工・工業系の日影（仕様 SJ1〜SJ3）', () => {
  it('SJ1: 準工・工業系は、条例の値が揃っていても判定しない', () => {
    expect(shadowRuleFromOrdinance('準工・工業系', confirmedAll).ok).toBe(false)
  })

  it('SJ2: 理由は、準工業は対象・工業と工業専用は対象外だが区別していないことを言う（「対象外」とだけは言わない）', () => {
    const r = shadowRuleFromOrdinance('準工・工業系', confirmedAll)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toContain('準工業は日影の対象')
    expect(r.reason).toContain('工業・工業専用は対象外')
    expect(r.reason).not.toBe('対象外（この用途地域の規制値は未確認）')
  })

  it('SJ3: 住居系は従来どおり、確認済みの条例の値で判定に使う', () => {
    expect(shadowRuleFromOrdinance('住居系', confirmedAll).ok).toBe(true)
  })
})

it('PLATEAUで準工業と特定できた場合は確認済み条例値で判定できる',()=>{
  expect(shadowRuleFromOrdinance('準工・工業系',confirmedAll,{urfFunction:11}).ok).toBe(true)
})
it('準工業と特定できても条例値を勝手に確定しない',()=>{
  const r=shadowRuleFromOrdinance('準工・工業系',[],{urfFunction:11})
  expect(r.ok).toBe(false)
  if(!r.ok) expect(r.reason).toContain('未入力')
})

it('敷地の工業・工業専用コードを採用して区別する',()=>{
 for(const code of [12,13]) {
  const r=shadowRuleFromOrdinance('準工・工業系',[],{urfFunction:code})
  expect(r.ok).toBe(false)
  if(!r.ok) {expect(r.reason).toContain(code===12?'工業地域':'工業専用地域');expect(r.reason).toContain('周辺の対象区域')}
 }
})
