// 仕様（ハブ A-03 G10・G14・G82、D-04 「要確認の印」。決定に合わせる直し 2026-11-05）: Claude の提案の確信度で、確定・要確認・人が選ぶ、を分ける。閾値は仮置き（G10）。
// 仕様 1: 確信度が 0.85 以上なら確定（印なし）。0.5 以上 0.85 未満は要確認（needs_review）。
// 仕様 2: 閾値ちょうどは上の帯。数でない値は人が選ぶ（null）。0 から 1 の外は、安全側に要確認。
// 仕様 3: 0.5 未満の提案は、種類を入れずに人が選ぶ（店舗に入らない）。確定と要確認は、誰が＝Claude で入る。人が確定した線は上書きしない。
// 注: 旧の仕様（0.5 未満も要確認として入る）は決定と違っていたため、期待値を直した（G10 の行・G82）。
import { beforeEach, describe, expect, it } from 'vitest'
import { REVIEW_THRESHOLD, reviewStatusOf } from './reviewThreshold'
import { useSemantic } from '../store/semantic'

describe('提案の確認状態（仕様 1・2）', () => {
  it('閾値は 0.85（仮置き。ハブ G10）', () => {
    expect(REVIEW_THRESHOLD).toBe(0.85)
  })

  it('閾値以上は確定、閾値より低いと要確認。閾値ちょうどは確定', () => {
    expect(reviewStatusOf(0.9)).toBe('confirmed')
    expect(reviewStatusOf(0.85)).toBe('confirmed')
    expect(reviewStatusOf(0.84)).toBe('needs_review')
    expect(reviewStatusOf(0.5)).toBe('needs_review')
  })

  it('数でない値は人が選ぶ（null）。0〜1 の外は、安全側に要確認', () => {
    expect(reviewStatusOf(Number.NaN)).toBeNull()
    expect(reviewStatusOf(1.5)).toBe('needs_review')
    expect(reviewStatusOf(-0.1)).toBe('needs_review')
  })
})

describe('店舗に入る提案（仕様 3）', () => {
  beforeEach(() => {
    useSemantic.getState().clear()
  })

  it('確信度が高い提案は確定、0.5 未満の提案は店舗に入らない（人が選ぶ）', () => {
    useSemantic.getState().suggest('hi', 'wall', 0.95)
    useSemantic.getState().suggest('lo', 'wall', 0.4)
    const a = useSemantic.getState().assignments
    expect(a.hi).toEqual({ kind: 'wall', status: 'confirmed', by: 'claude' })
    expect(a.lo).toBeUndefined()
  })
})
