// 仕様（ハブ A-03 G15・D-02 C4「斜線・日影のパラメータ」）:
// 仕様 1: 日影の規制値（10 m 以内の時間・10 m 超の時間・測定面の高さ）は、人が出典つきで入れて確認した条例の値だけを使う。
//        どれか一つでも未入力・未確認なら規則を作らず、理由（判定不能）を返す。
// 仕様 2: 条例の値は数で入れる。「4」「4時間」「2.5 m」は受ける。「約4時間」「4時間30分」は数でないとして判定不能にする。
// 仕様 3: 作った規則の時間・測定面の高さ・距離の区分は、条例の値そのもの。高さの下限は法（別表第四）の値を用途地域から引く。
// 仕様 4: 用途地域に規制値が無い（対象外）ときは、条例の値があっても規則を作らず、対象外と返す。
// 仕様 5: 同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { shadowRuleFromOrdinance, SHADOW_KEYS } from './shadowOrdinance'
import type { OrdinanceEntry } from './ordinance'

const confirmedAll: OrdinanceEntry[] = [
  { key: SHADOW_KEYS.near, value: '4時間', source: '東京都条例 別表', confirmed: true },
  { key: SHADOW_KEYS.far, value: '2.5時間', source: '東京都条例 別表', confirmed: true },
  { key: SHADOW_KEYS.height, value: '4 m', source: '東京都条例 別表', confirmed: true },
]

function withValue(entries: OrdinanceEntry[], key: string, patch: Partial<OrdinanceEntry>): OrdinanceEntry[] {
  return entries.map((e) => (e.key === key ? { ...e, ...patch } : e))
}

describe('日影の規制値は確認済みの条例の値だけ（仕様 1）', () => {
  it('三つとも確認済みなら、条例の値で規則を作る', () => {
    const r = shadowRuleFromOrdinance('住居系', confirmedAll)
    expect(r.ok).toBe(true)
  })

  it('一つでも未確認なら判定に使わず、未確認と返す', () => {
    const r = shadowRuleFromOrdinance('住居系', withValue(confirmedAll, SHADOW_KEYS.height, { confirmed: false }))
    expect(r).toEqual({ ok: false, reason: '判定不能（条例の値が未確認）' })
  })

  it('一つでも未入力なら判定に使わず、未入力と返す', () => {
    const r = shadowRuleFromOrdinance('住居系', confirmedAll.filter((e) => e.key !== SHADOW_KEYS.far))
    expect(r).toEqual({ ok: false, reason: '判定不能（条例の値が未入力）' })
  })

  it('出典が空なら確認済みにならず、未確認と返す', () => {
    const r = shadowRuleFromOrdinance('住居系', withValue(confirmedAll, SHADOW_KEYS.near, { source: '' }))
    expect(r).toEqual({ ok: false, reason: '判定不能（条例の値が未確認）' })
  })
})

describe('条例の値は数で入れる（仕様 2）', () => {
  it('「4時間」「2.5時間」「4 m」は数として受ける', () => {
    const r = shadowRuleFromOrdinance('住居系', confirmedAll)
    expect(r.ok && r.rule.bands).toEqual([
      { maxDistanceM: 10, hours: 4 },
      { maxDistanceM: Infinity, hours: 2.5 },
    ])
    expect(r.ok && r.rule.measurementHeightM).toBe(4)
  })

  it('「約4時間」「4時間30分」は数でないとして判定不能', () => {
    const approx = shadowRuleFromOrdinance('住居系', withValue(confirmedAll, SHADOW_KEYS.near, { value: '約4時間' }))
    expect(approx).toEqual({ ok: false, reason: '判定不能（条例の値が数でない）' })
    const minutes = shadowRuleFromOrdinance('住居系', withValue(confirmedAll, SHADOW_KEYS.far, { value: '4時間30分' }))
    expect(minutes).toEqual({ ok: false, reason: '判定不能（条例の値が数でない）' })
  })
})

describe('規則の中身（仕様 3）', () => {
  it('高さの下限は法の値を用途地域から引く（低層は 7 m、住居系は 10 m）', () => {
    const low = shadowRuleFromOrdinance('低層住専', confirmedAll)
    expect(low.ok && low.rule.minHeightMm).toBe(7_000)
    const res = shadowRuleFromOrdinance('住居系', confirmedAll)
    expect(res.ok && res.rule.minHeightMm).toBe(10_000)
  })
})

describe('対象外の用途地域（仕様 4）', () => {
  it('規制値が無い用途地域は、条例の値があっても対象外', () => {
    expect(shadowRuleFromOrdinance('商業系', confirmedAll)).toEqual({ ok: false, reason: '対象外（この用途地域の規制値は未確認）' })
  })
})

describe('同じ入力には同じ出力（仕様 5）', () => {
  it('同じ入力なら同じ結果', () => {
    expect(shadowRuleFromOrdinance('住居系', confirmedAll)).toEqual(shadowRuleFromOrdinance('住居系', confirmedAll))
  })
})
