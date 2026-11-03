// 仕様（ハブ A-03 G73・G74）: 右パネルの各タイルは、× で閉じられる。閉じたタイルは、戻すまで出ない。
// 仕様 1: 初めは全部のタイルが出ている（閉じた数 0）。
// 仕様 2: hideTile で、そのタイルだけ閉じる。ほかのタイルは変わらない。
// 仕様 3: showTile で、閉じたタイルを戻す。
// 仕様 4: 同じタイルを二度閉じても、戻すのは一度でよい（閉じた状態は一つ）。
// 仕様 5: reset で、全部のタイルを出す。
import { beforeEach, describe, expect, it } from 'vitest'
import { usePanelTiles } from './panelTiles'

beforeEach(() => usePanelTiles.getState().reset())

describe('右パネルのタイル（閉じる・戻す）', () => {
  it('仕様 1: 初めは閉じたタイルが無い', () => {
    expect(usePanelTiles.getState().hidden).toEqual({})
  })

  it('仕様 2: hideTile は、そのタイルだけを閉じる', () => {
    usePanelTiles.getState().hideTile('milestone')
    expect(usePanelTiles.getState().hidden).toEqual({ milestone: true })
    expect(usePanelTiles.getState().hidden.semantic).toBeUndefined()
  })

  it('仕様 3: showTile は、閉じたタイルを戻す', () => {
    usePanelTiles.getState().hideTile('milestone')
    usePanelTiles.getState().hideTile('semantic')
    usePanelTiles.getState().showTile('milestone')
    expect(usePanelTiles.getState().hidden).toEqual({ semantic: true })
  })

  it('仕様 4: 同じタイルを二度閉じても、閉じた状態は一つ（戻すと出る）', () => {
    usePanelTiles.getState().hideTile('milestone')
    usePanelTiles.getState().hideTile('milestone')
    expect(Object.keys(usePanelTiles.getState().hidden)).toEqual(['milestone'])
    usePanelTiles.getState().showTile('milestone')
    expect(usePanelTiles.getState().hidden).toEqual({})
  })

  it('仕様 5: reset で、全部のタイルを出す', () => {
    usePanelTiles.getState().hideTile('milestone')
    usePanelTiles.getState().hideTile('fixtures')
    usePanelTiles.getState().reset()
    expect(usePanelTiles.getState().hidden).toEqual({})
  })
})
