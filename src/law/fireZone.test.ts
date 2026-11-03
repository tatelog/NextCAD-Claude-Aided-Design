// 仕様（ハブ A-03 G28・D-02 C11。出典: 法 61 条 1 項を e-Gov 法令 API で 2026-11-04 に確認。数値条件（階数・延べ面積）は政令に委ねられ、ここでは確かめていない）:
// 防火地域・準防火地域の法規は、地点に当たる地域の区分から、判定の結果を決める。数値条件が未確認のものは「判定不能」と出し、推測で埋めない。
// 仕様 1: 地点に防火地域（区分 24）か準防火地域（区分 25）があれば、法 61 条 1 項は「判定不能（政令・告示の基準が未確認）」。
// 仕様 2: 地点に防火・準防火の地域が無ければ、「対象外（防火地域・準防火地域の指定なし）」。
// 仕様 3: 区分が不明（未取得・知らないコード）の地域があれば、「判定不能（区分が未取得）」。区分が 24・25 の地域と混じっても、不明を優先して出す。
// 仕様 4: 入力を書き換えず、同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { fireDecisionLine } from './fireZone'

describe('防火・準防火地域の判定の文（仕様 1〜4）', () => {
  it('仕様 1: 防火（24）か準防火（25）があれば、判定不能（政令・告示の基準が未確認）', () => {
    expect(fireDecisionLine([{ function: 24 }])).toBe('法 61 条 1 項: 判定不能（政令・告示の基準が未確認）')
    expect(fireDecisionLine([{ function: 25 }])).toBe('法 61 条 1 項: 判定不能（政令・告示の基準が未確認）')
  })

  it('仕様 2: 地域が無ければ対象外', () => {
    expect(fireDecisionLine([])).toBe('法 61 条 1 項: 対象外（防火地域・準防火地域の指定なし）')
  })

  it('仕様 3: 区分が不明の地域があれば、区分が未取得として判定不能（混じっても不明を優先）', () => {
    expect(fireDecisionLine([{ function: null }])).toBe('法 61 条 1 項: 判定不能（区分が未取得）')
    expect(fireDecisionLine([{ function: 24 }, { function: 99 }])).toBe('法 61 条 1 項: 判定不能（区分が未取得）')
  })

  it('仕様 4: 同じ入力には同じ出力で、入力を書き換えない', () => {
    const input = [{ function: 24 as number | null }]
    expect(fireDecisionLine(input)).toBe(fireDecisionLine(input))
    expect(input).toEqual([{ function: 24 }])
  })
})
