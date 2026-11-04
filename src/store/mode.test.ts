// 仕様（ハブ A-03 G95・G43。統括の依頼 t55、2026-11-04）: 作業のモードは、描画（今作っているシステム）と Claude の二つ。
// 仕様 1（切り替え・G95）: Claude に切り替えると、右パネルのチャットを開き、機能の調整を閉じる。
// 仕様 2（描画へ・G43）: 描画に戻すと、右パネルに機能の調整（G43）を出し、チャットを閉じる。
// 仕様 3（閉じた後）: × で閉じたあとでも、モードを切り替えれば、そのモードの項目を開く。
// 仕様 4（項目）: モードの項目は、右パネルの項目の一覧に入る二つ（MODE_TILE_IDS）。
import { beforeEach, describe, expect, it } from 'vitest'
import { TILE_OF_MODE, useMode } from './mode'
import { MODE_TILE_IDS, usePanelTiles } from './panelTiles'

beforeEach(() => {
  usePanelTiles.getState().reset()
  useMode.setState({ mode: 'draw' })
})

describe('モードの切り替え（仕様 1・2）', () => {
  it('Claude に切り替えると、チャットを開き、機能の調整を閉じる', () => {
    useMode.getState().setMode('claude')
    expect(useMode.getState().mode).toBe('claude')
    expect(usePanelTiles.getState().hidden).toEqual({ 'feature-adjust': true })
  })

  it('描画に戻すと、機能の調整を出し、チャットを閉じる', () => {
    useMode.getState().setMode('claude')
    useMode.getState().setMode('draw')
    expect(useMode.getState().mode).toBe('draw')
    expect(usePanelTiles.getState().hidden).toEqual({ 'claude-chat': true })
  })
})

describe('閉じた後（仕様 3）', () => {
  it('× で閉じたチャットも、モードを切り替えれば開く', () => {
    useMode.getState().setMode('claude')
    usePanelTiles.getState().hideTile('claude-chat')
    useMode.getState().setMode('claude')
    expect(usePanelTiles.getState().hidden['claude-chat']).toBeUndefined()
  })
})

describe('モードの項目（仕様 4）', () => {
  it('対応する項目は、右パネルの項目の一覧に入る二つ', () => {
    expect([TILE_OF_MODE.draw.open, TILE_OF_MODE.claude.open].sort()).toEqual([...MODE_TILE_IDS].sort())
  })
})
