// 仕様（ハブ A-03 G75。1F の共用部は、基準階の区画に利用者が 1F の名前を付けて表す）: 区画ごとの 1F の名前を、画面の中で持つ。
// 仕様 1: 名前を付けると、その区画の名前になる。
// 仕様 2: null を付けると、その区画の名前は外れる（ほかの区画は変わらない）。
// 仕様 3: reset で、すべて外れる。
import { beforeEach, describe, expect, it } from 'vitest'
import { useFirstFloor } from './firstFloor'

beforeEach(() => useFirstFloor.getState().reset())

describe('1F の共用部の名前（区画ごと。仕様 1〜3）', () => {
  it('仕様 1: 名前を付けると、その区画の名前になる', () => {
    useFirstFloor.getState().setName('cell-1', 'エントランス')
    expect(useFirstFloor.getState().names).toEqual({ 'cell-1': 'エントランス' })
  })

  it('仕様 2: null で外れる。ほかの区画は変わらない', () => {
    useFirstFloor.getState().setName('cell-1', 'エントランス')
    useFirstFloor.getState().setName('cell-2', 'ロビー')
    useFirstFloor.getState().setName('cell-1', null)
    expect(useFirstFloor.getState().names).toEqual({ 'cell-2': 'ロビー' })
  })

  it('仕様 3: reset で、すべて外れる', () => {
    useFirstFloor.getState().setName('cell-1', 'エントランス')
    useFirstFloor.getState().reset()
    expect(useFirstFloor.getState().names).toEqual({})
  })
})
