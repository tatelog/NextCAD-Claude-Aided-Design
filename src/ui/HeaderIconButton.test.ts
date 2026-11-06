// 仕様（代表の依頼 2026-11-06。共通ヘッダーはテキストではなく SVG アイコンだけ。基本ボタンの枠は無くす）:
// HB1: ヘッダーのボタンは文字を出さない（見えるのは SVG だけ）。名前は aria-label と title（指を置くと出る）に、今のボタンの文字のまま入る。
// HB2: 選ばれている（押されている）ものは aria-pressed で示す。
// HB3: 押せないときは disabled。
// HB4: 枠（border）は付けない。押せることは、CSS（hdr-btn）の指を置いた・押した時の背景の色で示す（インラインの枠は無し）。
// HB5: アイコンの SVG は読み上げから外す（aria-hidden）。
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HeaderIconButton } from './HeaderIconButton'
import { IconHistory, IconJudge, IconLoad, IconMenu, IconModeChat, IconModeDrawing, IconModeSystem, IconSave } from './headerIcons'

const html = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(el)
/** ボタンの中で、見えている文字（SVG と属性を除いたもの） */
const visibleTextOf = (markup: string): string => markup.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim()

describe('ヘッダーのボタン（仕様 HB1〜HB4）', () => {
  it('HB1: 文字は出さず、名前は aria-label と title に入る', () => {
    const out = html(createElement(HeaderIconButton, { label: '読み込み', icon: createElement(IconLoad) }))
    expect(out).toContain('aria-label="読み込み"')
    expect(out).toContain('title="読み込み"')
    expect(visibleTextOf(out)).toBe('')
  })

  it('HB2: 押されているものは aria-pressed="true"', () => {
    const out = html(createElement(HeaderIconButton, { label: '作業履歴', icon: createElement(IconHistory), pressed: true }))
    expect(out).toContain('aria-pressed="true"')
  })

  it('HB3: 押せないときは disabled', () => {
    const out = html(createElement(HeaderIconButton, { label: '意味づけを判定', icon: createElement(IconJudge), disabled: true }))
    expect(out).toContain('disabled=""')
  })

  it('HB4: 枠（border）はインラインに付けない。hdr-btn の CSS で、背景の色だけで示す', () => {
    const out = html(createElement(HeaderIconButton, { label: '保存', icon: createElement(IconSave) }))
    expect(out).toContain('class="hdr-btn"')
    expect(out).not.toMatch(/border/)
  })
})

describe('アイコン（仕様 HB5）', () => {
  it('HB5: どのアイコンも、読み上げから外す（aria-hidden）', () => {
    for (const Icon of [IconJudge, IconLoad, IconSave, IconHistory, IconMenu, IconModeSystem, IconModeChat, IconModeDrawing]) {
      const out = html(createElement(Icon))
      expect(out).toContain('aria-hidden="true"')
      expect(out).toContain('<svg')
    }
  })
})
