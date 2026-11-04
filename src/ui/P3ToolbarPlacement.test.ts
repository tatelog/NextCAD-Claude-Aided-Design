// 仕様（統括の依頼 2026-11-05、G52 の代表の決定）: P3 のペンの道具は、P2 と同じ店舗の置き場（toolbarPlacement）に従う。P3 だけ上に固定しない。
//   仕様 1（上）: 置き場が「上」のとき、道具は上に 1 つ出る。
//   仕様 2（左）: 置き場が「左」のとき、道具は左に 1 つ出て、上には出ない。
//   仕様 3（独立）: 置き場が「独立」のとき、道具は独立に 1 つ出て、上・左には出ない。
//   仕様 4（描く画面は残る）: どの置き場でも、P3 の描く画面（p3-canvas）は出る。
// 描画は実物（react-dom/server の静的描画）。置き場は店舗（zustand）の値で切り替える。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useUi, type ToolbarPlacement } from '../store/ui'
import { P3Plan } from './P3Plan'

// 描画（react-dom/server）では zustand が初期の状態（getInitialState）を返すので、置き場は今の状態を読む形に差し替える（P3Fixtures.test.ts と同じ理由）
vi.mock('../store/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/ui')>()
  const live = <T>(selector: (s: ReturnType<typeof actual.useUi.getState>) => T): T => selector(actual.useUi.getState())
  return { ...actual, useUi: Object.assign(live, actual.useUi) }
})

const htmlOf = (): string => renderToStaticMarkup(createElement(P3Plan))
// 道具の枠（class: pen-toolbar is-上・左・独立）の数
const toolbarsOf = (html: string, placement: ToolbarPlacement): number => html.split(`pen-toolbar is-${placement}`).length - 1
const toolbarCount = (html: string): number => html.split('class="pen-toolbar ').length - 1

describe('P3 のペンの道具の置き場（統括の依頼・G52。P2 と同じ店舗の値に従う）', () => {
  afterEach(() => {
    useUi.getState().setToolbarPlacement('top')
  })

  it('仕様 1: 置き場が上なら、道具は上に 1 つ出る', () => {
    useUi.getState().setToolbarPlacement('top')
    const html = htmlOf()
    expect(toolbarsOf(html, 'top')).toBe(1)
    expect(toolbarCount(html)).toBe(1)
  })

  it('仕様 2: 置き場が左なら、道具は左に 1 つだけ出る', () => {
    useUi.getState().setToolbarPlacement('left')
    const html = htmlOf()
    expect(toolbarsOf(html, 'left')).toBe(1)
    expect(toolbarsOf(html, 'top')).toBe(0)
    expect(toolbarCount(html)).toBe(1)
  })

  it('仕様 3: 置き場が独立なら、道具は独立に 1 つだけ出る', () => {
    useUi.getState().setToolbarPlacement('free')
    const html = htmlOf()
    expect(toolbarsOf(html, 'free')).toBe(1)
    expect(toolbarsOf(html, 'top')).toBe(0)
    expect(toolbarsOf(html, 'left')).toBe(0)
    expect(toolbarCount(html)).toBe(1)
  })

  it.each(['top', 'left', 'free'] as const)('仕様 4: 置き場が %s でも、描く画面は出る', (placement) => {
    useUi.getState().setToolbarPlacement(placement)
    expect(htmlOf()).toContain('data-testid="p3-canvas"')
  })
})
