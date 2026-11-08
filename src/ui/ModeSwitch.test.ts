// 仕様（代表の依頼 2026-11-06。モードの切り替えは、文字を消してアイコンだけ。選ばれているものは背景の色で示す。名前は今のまま（aria-label と title））:
// MS1: 使えるモード（P2 は System・Chat・Drawing）を、表の順に、アイコンだけのボタンで並べる。名前は aria-label と title に入る。
// MS2: 選ばれているモードだけが aria-pressed="true"。
// MS3: 使えるモードが一つだけの画面（P5）は、切り替えを出さない（今のまま）。
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ModeSwitch } from './ModeSwitch'

const html = (screen: string, activeMode: string) =>
  renderToStaticMarkup(createElement(ModeSwitch, { screen, activeMode, onPick: () => undefined }))
const visibleTextOf = (markup: string): string => markup.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim()

describe('モードの切り替え（仕様 MS1〜MS3）', () => {
  // Codex の版を正とする（代表の決定 2026-11-08）: P2 の切り替えから Drawing を外した（ModeSwitch.tsx で P2 だけ drawing を除く）。P3 は 3 つのまま
  it('MS1: P2 は System・Chat を、アイコンだけで名前つきに並べる（Drawing は出さない。P3 は Drawing も出す）', () => {
    const out = html('P2', 'system')
    const names = [...out.matchAll(/aria-label="([^"]+)"/g)].map((m) => m[1])
    expect(names).toEqual(['モード', 'System', 'Chat'])
    expect(out).toContain('title="System"')
    expect(out).toContain('title="Chat"')
    expect(out).not.toContain('Drawing')
    expect(out.match(/<button/g)?.length).toBe(2)
    expect(visibleTextOf(out)).toBe('')
    const p3 = [...html('P3', 'system').matchAll(/aria-label="([^"]+)"/g)].map((m) => m[1])
    expect(p3).toEqual(['モード', 'System', 'Chat', 'Drawing'])
  })

  it('MS2: 選ばれているモードだけが aria-pressed="true"', () => {
    const out = html('P2', 'chat')
    expect(out).toMatch(/aria-label="Chat"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*aria-label="Chat"/)
    expect(out.match(/aria-pressed="true"/g)?.length).toBe(1)
  })

  it('MS3: 使えるモードが一つだけの画面（P5）は、切り替えを出さない', () => {
    expect(html('P5', 'system')).toBe('')
  })
})
