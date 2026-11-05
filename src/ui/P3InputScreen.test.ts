// 仕様（統括の依頼 2026-11-06。依頼 3「P3 の入力を店舗に移し、P4 へ行って戻っても消えないようにする」）:
// 仕様 16（画面が店舗の入力を読む）: P3 の画面の幅・スパンの欄は、店舗に入っている値を出す（画面の既定に戻さない）。
// 仕様 17（店舗が空のとき）: 店舗の値が既定なら、画面の幅は既定（20000）を出す。
// 描画は実物（react-dom/server）。差し替えるのは、入力の店舗（useP3Input）の読み出しだけ（店舗の値を試験ごとに変えるため）。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const p3 = vi.hoisted(() => ({ values: {} as Record<string, unknown> }))
vi.mock('../store/p3Input', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/p3Input')>()
  const hook = Object.assign((selector: (s: unknown) => unknown) => selector({ values: p3.values, setValue: () => undefined }), {
    getState: () => ({ values: p3.values, setValue: () => undefined }),
  })
  return { ...actual, useP3Input: hook }
})
vi.mock('../store/fixtures', () => ({
  useFixtures: (selector: (s: unknown) => unknown) =>
    selector({ fixtures: [], selectedItem: null, selectItem: () => undefined, placeSelected: () => undefined, remove: () => undefined, setUnitIds: () => undefined, unitIds: null }),
}))

import { P3_INPUT_DEFAULTS } from '../store/p3Input'
import { P3Plan } from './P3Plan'

const htmlOf = (): string => renderToStaticMarkup(createElement(P3Plan))

describe('P3 の画面は、店舗の入力を出す（依頼 3）', () => {
  it('仕様 16: 店舗に入っている幅・スパンを、画面の欄に出す', () => {
    p3.values = { ...P3_INPUT_DEFAULTS, widthText: '40601', spanText: '6000' }
    const html = htmlOf()
    expect(html).toContain('value="40601"')
    expect(html).toContain('value="6000"')
  })

  it('仕様 17: 店舗が既定のままなら、画面の幅は既定（20000）', () => {
    p3.values = { ...P3_INPUT_DEFAULTS }
    expect(htmlOf()).toContain('value="20000"')
  })
})
