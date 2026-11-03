// 仕様（ハブ A-03 G28。部材の耐火時間の入力）: 部材ごとの耐火時間（分）を、画面の中で持つ。入力が無い部材は、判定不能のまま。
// 仕様 1: 初めは、どの部材も入力が無い（null）。
// 仕様 2: 入力すると、その部材の耐火時間になる。null に戻すと入力が無くなる（ほかの部材は変わらない）。
import { beforeEach, describe, expect, it } from 'vitest'
import { useComponentFire } from './componentFire'

beforeEach(() => useComponentFire.getState().reset())

describe('部材の耐火時間の入力（仕様 1・2）', () => {
  it('仕様 1: 初めは入力が無い', () => {
    expect(useComponentFire.getState().ratings).toEqual({})
  })

  it('仕様 2: 入力すると、その部材だけ変わる。null で入力を外す', () => {
    useComponentFire.getState().setRating('柱', 60)
    useComponentFire.getState().setRating('床', 90)
    useComponentFire.getState().setRating('柱', null)
    expect(useComponentFire.getState().ratings).toEqual({ 床: 90 })
  })
})
