// 仕様（ハブ A-03 G95・G100・G73。統括の依頼 t57、2026-11-04。2026-11-05 の 2b の改定で更新）:
// 仕様 1（P1・P4）: 右パネルのチャットの項目は、Chat のモードのときに出る（表 screenModes。P1・P4 は System・Chat）。
// 仕様 2（システム）: 今のモードがシステムのときは、チャットの項目は出ない（機能の調整が出る）。
// 仕様 3（P5）: P5 は System だけ（表 screenModes。切替は出さない）。Chat は無いので、チャットの項目は出ない。
// 仕様 4: × で閉じたチャットは出ない（G73）。
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
const SCREENS: Record<'P1' | 'P4', () => ReactElement> = { P1: P1Site, P4: P4Estimate }

beforeEach(() => {
  shell.mode = 'system'
  shell.hidden = {}
})

describe.each(['P1', 'P4'] as const)('%s の右パネルのチャット（仕様 1・2・4）', (screen) => {
  it('今のモードがシステムのときは、チャットの項目は出ない（仕様 2）', () => {
    expect(renderToStaticMarkup(createElement(SCREENS[screen]))).not.toContain(TITLE)
  })

  it('チャットのモードのときは、チャットの項目が出る（仕様 1）', () => {
    shell.mode = 'chat'
    expect(renderToStaticMarkup(createElement(SCREENS[screen]))).toContain(TITLE)
  })

  it('× で閉じたチャットは出ない（仕様 4）', () => {
    shell.mode = 'chat'
    shell.hidden = { 'claude-chat': true }
    expect(renderToStaticMarkup(createElement(SCREENS[screen]))).not.toContain(TITLE)
  })
})

describe('P5 の右パネル（仕様 3）', () => {
  it('P5 は System だけ。システムでもチャットでも、チャットの項目は出ない', () => {
    expect(renderToStaticMarkup(createElement(P5Output))).not.toContain(TITLE)
    shell.mode = 'chat'
    expect(renderToStaticMarkup(createElement(P5Output))).not.toContain(TITLE)
  })
})
