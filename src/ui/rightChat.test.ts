// 仕様（ハブ A-03 G95・G100・G73。統括の依頼 t57、2026-11-04）:
// 仕様 1: P1・P4・P5 の右パネルに、チャットの項目が出る（表 screenModes。この画面はチャットだけ）。
// 仕様 2: 今のモードがシステムでも、この画面はチャットとして扱うので、チャットの項目が出る（activeModeOf）。
// 仕様 3: × で閉じたチャットは出ない（G73。閉じた項目は、メニューの「右パネルの項目」で戻す）。
import { type ReactElement, createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { P1Site } from './P1Site'
import { P4Estimate } from './P4Estimate'
import { P5Output } from './P5Output'

// 描画（react-dom/server）では、店舗は初期の状態を返すので、ここで今の状態を渡す（既存の画面テストと同じ）
const shell = vi.hoisted(() => ({ mode: 'system', hidden: {} as Record<string, true> }))
vi.mock('../store/mode', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/mode')>()
  const screenModes = await import('../app/screenModes')
  return { ...actual, useActiveMode: (screen: string) => actual.activeModeOf(screenModes.SCREEN_MODES, shell.mode, screen) }
})
vi.mock('../store/panelTiles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/panelTiles')>()
  return { ...actual, usePanelTiles: (selector: (s: { hidden: Record<string, true> }) => unknown) => selector({ hidden: shell.hidden }) }
})
// P1 は既定で 3D の近隣建物を描く。描画の確認に 3D は要らないので、空の部品に替える
vi.mock('./NeighborScene3D', () => ({ NeighborScene3D: () => null }))
// OrdinanceForm は描画で Worker の場所（window）を読む。この試験は右パネルだけを見るので、空の部品に替える
vi.mock('./OrdinanceForm', () => ({ OrdinanceForm: () => null }))

const TITLE = 'Claude（チャット）'
const SCREENS: Record<'P1' | 'P4' | 'P5', () => ReactElement> = { P1: P1Site, P4: P4Estimate, P5: P5Output }

beforeEach(() => {
  shell.mode = 'system'
  shell.hidden = {}
})

describe.each(['P1', 'P4', 'P5'] as const)('%s の右パネルのチャット（仕様 1・2）', (screen) => {
  it('今のモードがシステムでも、チャットの項目が出る', () => {
    expect(renderToStaticMarkup(createElement(SCREENS[screen]))).toContain(TITLE)
  })

  it('チャットのモードでも、チャットの項目が出る', () => {
    shell.mode = 'chat'
    expect(renderToStaticMarkup(createElement(SCREENS[screen]))).toContain(TITLE)
  })

  it('× で閉じたチャットは出ない（仕様 3）', () => {
    shell.hidden = { 'claude-chat': true }
    expect(renderToStaticMarkup(createElement(SCREENS[screen]))).not.toContain(TITLE)
  })
})
