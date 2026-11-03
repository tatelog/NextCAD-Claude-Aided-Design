// 仕様（ハブ A-03 G10・G14、D-04 「要確認の印」）: Claude の提案の確信度が低い線には「要確認」の印を付ける。閾値は仮置き（G10 で測ってから決める）。
// 仕様 1: 確信度が閾値（0.8・仮置き）以上なら、提案は確定（confirmed）として入る。閾値より低ければ要確認（needs_review）。
// 仕様 2: 閾値ちょうどは確定。数でない・0 から 1 の外は、安全側に要確認にする。
// 仕様 3: 店舗に入れた提案は、この判定に従う（誰が＝Claude）。人が確定した線は上書きしない。
import { beforeEach, describe, expect, it } from 'vitest'
import { REVIEW_THRESHOLD, reviewStatusOf } from './reviewThreshold'
import { useSemantic } from '../store/semantic'

describe('提案の確認状態（仕様 1・2）', () => {
  it('閾値は 0.8（仮置き）', () => {
    expect(REVIEW_THRESHOLD).toBe(0.8)
  })

  it('閾値以上は確定、閾値より低いと要確認。閾値ちょうどは確定', () => {
    expect(reviewStatusOf(0.9)).toBe('confirmed')
    expect(reviewStatusOf(0.8)).toBe('confirmed')
    expect(reviewStatusOf(0.5)).toBe('needs_review')
  })

  it('数でない・範囲の外は、安全側に要確認', () => {
    expect(reviewStatusOf(Number.NaN)).toBe('needs_review')
    expect(reviewStatusOf(1.5)).toBe('needs_review')
    expect(reviewStatusOf(-0.1)).toBe('needs_review')
  })
})

describe('店舗に入る提案（仕様 3）', () => {
  beforeEach(() => {
    useSemantic.getState().clear()
  })

  it('確信度が高い提案は確定、低い提案は要確認。どちらも誰が＝Claude', () => {
    useSemantic.getState().suggest('hi', 'wall', 0.95)
    useSemantic.getState().suggest('lo', 'wall', 0.4)
    const a = useSemantic.getState().assignments
    expect(a.hi).toEqual({ kind: 'wall', status: 'confirmed', by: 'claude' })
    expect(a.lo).toEqual({ kind: 'wall', status: 'needs_review', by: 'claude' })
  })
})
