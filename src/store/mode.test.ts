// 仕様（ハブ A-03 G100・G95・G43・G101。統括の依頼 t57、2026-11-04）: 作業のモードは、System（1）・Chat（2）・Drawing（3）。
// 仕様 1（切替）: モードを切り替えると、そのモードの右メニューの項目を開く（閉じていても）。
// 仕様 2（出る項目）: 右メニューの項目は、モードと画面の組で決まる（表 screenModes）。使えないモードの項目は出ない。
// 仕様 3（閉じた項目）: × で閉じた項目は、出ない。切り替えで開き直す。
// 仕様 4（既定）: 最初はシステム。
// 仕様 5（画面で使えない今のモード）: 画面で使えないモードのとき、その画面で使える最初のモードとして扱う。
import { beforeEach, describe, expect, it } from 'vitest'
import { activeModeOf, isRightItemShown, useMode } from './mode'
import { usePanelTiles } from './panelTiles'
import { SCREEN_MODES } from '../app/screenModes'

beforeEach(() => {
  usePanelTiles.getState().reset()
  useMode.setState({ mode: 'system' })
})

describe('切替（仕様 1・3）', () => {
  it('最初はシステム（仕様 4）', () => {
    expect(useMode.getState().mode).toBe('system')
  })

  it('チャットに切り替えると、チャットの項目を開く（閉じていても）', () => {
    usePanelTiles.getState().hideTile('claude-chat')
    useMode.getState().setMode('chat')
    expect(useMode.getState().mode).toBe('chat')
    expect(usePanelTiles.getState().hidden['claude-chat']).toBeUndefined()
  })

  it('システムに切り替えると、機能の調整を開く', () => {
    usePanelTiles.getState().hideTile('feature-adjust')
    useMode.getState().setMode('system')
    expect(usePanelTiles.getState().hidden['feature-adjust']).toBeUndefined()
  })
})

describe('今のモードの扱い（仕様 5）', () => {
  it('使えるモードは、そのまま今のモード', () => {
    expect(activeModeOf(SCREEN_MODES, 'chat', 'P2')).toBe('chat')
    expect(activeModeOf(SCREEN_MODES, 'system', 'P3')).toBe('system')
  })

  it('P1 でシステムは使えないので、チャットとして扱う', () => {
    expect(activeModeOf(SCREEN_MODES, 'system', 'P1')).toBe('chat')
  })

  it('Drawing（使えない）は、その画面で使える最初のモード（P2 はシステム）', () => {
    expect(activeModeOf(SCREEN_MODES, 'drawing', 'P2')).toBe('system')
  })
})

describe('右メニューに出る項目（仕様 2・3）', () => {
  it('P2 のシステムには機能の調整が出て、チャットは出ない', () => {
    expect(isRightItemShown(SCREEN_MODES, 'system', 'P2', {}, 'feature-adjust')).toBe(true)
    expect(isRightItemShown(SCREEN_MODES, 'system', 'P2', {}, 'claude-chat')).toBe(false)
  })

  it('P4 のシステムは、どの項目も出ない（P4 はチャットだけ）', () => {
    expect(isRightItemShown(SCREEN_MODES, 'system', 'P4', {}, 'feature-adjust')).toBe(false)
  })

  it('閉じた項目（×）は出ない', () => {
    expect(isRightItemShown(SCREEN_MODES, 'chat', 'P1', { 'claude-chat': true }, 'claude-chat')).toBe(false)
  })
})
