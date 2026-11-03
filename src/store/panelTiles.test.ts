// 仕様（ハブ A-03 G73・G74）: 右パネルの各タイルは、× で閉じられる。閉じたタイルは、戻すまで出ない。
// 仕様 1: 初めは全部のタイルが出ている（閉じた数 0）。
// 仕様 2: hideTile で、そのタイルだけ閉じる。ほかのタイルは変わらない。
// 仕様 3: showTile で、閉じたタイルを戻す。
// 仕様 4: 同じタイルを二度閉じても、戻すのは一度でよい（閉じた状態は一つ）。
// 仕様 5: reset で、全部のタイルを出す。
// 仕様 6（一覧）: 右パネルのタイルの一覧は、P3 の 4 つと P2 の 5 つ。ID と名前を持ち、ID は重複しない。メニューの「右パネルの項目」はこの一覧から作る（G74）。
// 仕様 7（P2）: P2 のタイルの ID は p2- で始まる（P2 の右パネルの節に付ける）。
import { beforeEach, describe, expect, it } from 'vitest'
import { PANEL_TILES, usePanelTiles } from './panelTiles'

beforeEach(() => usePanelTiles.getState().reset())

describe('右パネルのタイルの一覧（仕様 6）', () => {
  it('ID と名前を持ち、ID が重複しない（P3 の 4 つと P2 の 5 つ）', () => {
    const ids = PANEL_TILES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(PANEL_TILES.every((t) => t.id !== '' && t.title !== '')).toBe(true)
    expect(PANEL_TILES.map((t) => t.title)).toEqual([
      '什器',
      '節目の要約',
      '意味づけの確認（G14）',
      '自動で作る（柱割り・間取り・縦シャフト）',
      '外形',
      '階数・階高',
      'ボリューム',
      '数値で線を入れる',
      '回転',
    ])
  })

  it('P2 のタイルの ID は p2- で始まる', () => {
    const p2 = PANEL_TILES.filter((t) => t.id.startsWith('p2-'))
    expect(p2.map((t) => t.id)).toEqual(['p2-outline', 'p2-storey', 'p2-volume', 'p2-numeric', 'p2-rotate'])
  })
})

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
