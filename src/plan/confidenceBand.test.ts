// 仕様（決定。統括の依頼 2026-11-05。D-02 の閾値の行・ハブ G10、G82（代表、確定））:
// 確信度の三つの帯。0.85 以上は印なし（確定）。0.5 以上 0.85 未満は「要確認」の印。0.5 未満は意味を付けず、人が種別を選ぶ。
// この関数は W1（Claude の提案。店舗の suggest）と Drawing の判定の両方で使う（二つの実装を並べない）。
// 仕様 1（帯）: 0.85 以上は確定、0.5 以上 0.85 未満は要確認、0.5 未満は人が選ぶ。閾値ちょうどは上の帯。
// 仕様 2（数でない）: NaN・無限大は人が選ぶ（種類を入れない）。
// 仕様 3（範囲の外）: 0 から 1 の外の数は、安全側に要確認（従来どおり。種類は入れる）。
// 仕様 4（店舗）: 人が選ぶ帯の提案は店舗に入らない。要確認は要確認の印、確定は印なしで入る。どちらも誰が＝Claude。
// 仕様 5（人の確定）: 人が確定した線は、Claude の提案で上書きしない（G14）。
import { beforeEach, describe, expect, it } from 'vitest'
import { CONFIRM_MIN, confidenceBandOf, REVIEW_MIN } from './confidenceBand'
import { useSemantic } from '../store/semantic'

describe('三つの帯（仕様 1）', () => {
  it('閾値は 0.85（確定）と 0.5（要確認の下限）。仮置き（G10）', () => {
    expect(CONFIRM_MIN).toBe(0.85)
    expect(REVIEW_MIN).toBe(0.5)
  })

  it('0.85 以上は確定、0.5 以上 0.85 未満は要確認、0.5 未満は人が選ぶ。閾値ちょうどは上の帯', () => {
    expect(confidenceBandOf(0.9)).toBe('confirmed')
    expect(confidenceBandOf(0.85)).toBe('confirmed')
    expect(confidenceBandOf(0.84)).toBe('review')
    expect(confidenceBandOf(0.5)).toBe('review')
    expect(confidenceBandOf(0.49)).toBe('human')
    expect(confidenceBandOf(0)).toBe('human')
  })

  it('検査の結果（checks）が落ちれば、実効信頼度が下がって下の帯へ寄る', () => {
    expect(confidenceBandOf(0.9, [false])).toBe('human')
    // 3 件中 2 件通る: 0.9 × 2/3 = 0.6 は要確認
    expect(confidenceBandOf(0.9, [true, true, false])).toBe('review')
  })
})

describe('数でない値と範囲の外（仕様 2・3）', () => {
  it('NaN と無限大は人が選ぶ', () => {
    expect(confidenceBandOf(Number.NaN)).toBe('human')
    expect(confidenceBandOf(Number.POSITIVE_INFINITY)).toBe('human')
  })

  it('0 から 1 の外の数は、安全側に要確認', () => {
    expect(confidenceBandOf(1.5)).toBe('review')
    expect(confidenceBandOf(-0.1)).toBe('review')
  })
})

describe('店舗に入る提案（仕様 4・5）', () => {
  beforeEach(() => {
    useSemantic.getState().clear()
  })

  it('人が選ぶ帯の提案は、店舗に入らない（種類を入れない）', () => {
    useSemantic.getState().suggest('lo', 'wall', 0.4)
    useSemantic.getState().suggest('nan', 'wall', Number.NaN)
    expect(useSemantic.getState().assignments).toEqual({})
  })

  it('確定は印なし、要確認は要確認の印で入る。どちらも誰が＝Claude', () => {
    useSemantic.getState().suggest('hi', 'wall', 0.95)
    useSemantic.getState().suggest('mid', 'beam', 0.6)
    const a = useSemantic.getState().assignments
    expect(a.hi).toEqual({ kind: 'wall', status: 'confirmed', by: 'claude' })
    expect(a.mid).toEqual({ kind: 'beam', status: 'needs_review', by: 'claude' })
  })

  it('人が確定した線は、Claude の提案で上書きしない', () => {
    useSemantic.getState().setKind('p', 'column')
    useSemantic.getState().suggest('p', 'wall', 0.95)
    expect(useSemantic.getState().assignments.p).toEqual({ kind: 'column', status: 'confirmed', by: 'human' })
  })
})
