import { beforeEach, describe, expect, it } from 'vitest'
import { useComponentFire } from './componentFire'
import { DEFAULT_REBAR } from '../estimate/rebarCondition'

// 仕様（ハブ A-03 G86）から書いたテスト。鉄筋の被り厚と継手は、画面の中だけの仮の条件として持つ。
// - 既定は基準（被り厚 30 mm・重ね継手）。
// - 被り厚だけ、継手だけを変えられる。もう一方は残る。
// - reset で既定に戻る。

beforeEach(() => {
  useComponentFire.getState().reset()
})

describe('鉄筋の条件（被り厚・継手）の入力', () => {
  it('既定は基準（被り厚 30 mm・重ね継手）', () => {
    expect(useComponentFire.getState().rebar).toEqual(DEFAULT_REBAR)
  })

  it('被り厚だけを変えると、継手は残る', () => {
    useComponentFire.getState().setRebar({ coverMm: 50 })
    expect(useComponentFire.getState().rebar).toEqual({ coverMm: 50, joint: '重ね継手' })
  })

  it('継手だけを変えると、被り厚は残る', () => {
    useComponentFire.getState().setRebar({ joint: 'カプラー' })
    expect(useComponentFire.getState().rebar).toEqual({ coverMm: 30, joint: 'カプラー' })
  })

  it('reset で既定に戻る', () => {
    useComponentFire.getState().setRebar({ coverMm: 40, joint: 'カプラー' })
    useComponentFire.getState().reset()
    expect(useComponentFire.getState().rebar).toEqual(DEFAULT_REBAR)
  })
})
