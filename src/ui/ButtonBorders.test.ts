// 仕様（代表の決まり 2026-11-06「テキストが入る場合は枠入れてね」）:
// BB1: 文字が入るボタン（アイコンと文字の両方を含む）は枠あり。枠は CSS の btn-text で付け、インラインで枠を消さない。
// BB2: アイコンだけのボタンは枠なし（btn-icon）。押せることは背景の色の変化で示し、aria-label と title を付ける。
// BB3: 枠の決まりは styles.css に一か所で書く（btn-text は枠あり、btn-icon は枠なし）。
// 対象: 右パネルの × （TileClose）・メニューの折りたたみ（Fold）・メニューのチェックの行（MenuCheckRows）。
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TileClose } from './PanelTile'
import { Fold } from './Fold'
import { MenuCheckRows } from './MenuCheckRows'

const buttonsOf = (html: string): string[] => html.match(/<button[^>]*>/g) ?? []

// 代表の指示（2026-11-07、Codex 経由）: 右パネルの ×・メニューの折りたたみの見出し・メニューのチェックの行は、枠を消す。
// 代表の決定（2026-11-07）: Codex の今の版を正とする。BB1 の「この 3 つは枠あり」は廃止し、枠なしで、押せることと名前が分かることを確かめる。
describe('右パネルの ×・メニューの見出し・チェックの行は枠なし（BB1 の改め）', () => {
  it('BB1: 右パネルの × は枠なしで、何を閉じるかの名前（aria-label）が付く', () => {
    const [b] = buttonsOf(renderToStaticMarkup(createElement(TileClose, { title: '外形', onHide: () => undefined })))
    expect(b).toMatch(/border:\s*0/)
    expect(b).toContain('aria-label="外形を閉じる"')
  })

  it('BB1: メニューの折りたたみの見出しは枠なしで、開閉の状態（aria-expanded）を持つ', () => {
    const [b] = buttonsOf(renderToStaticMarkup(createElement(Fold, { title: 'クレジット（出典）' })))
    expect(b).toMatch(/border:\s*0/)
    expect(b).toMatch(/aria-expanded="(true|false)"/)
  })

  it('BB1: メニューのチェックの行は枠なしのチェックボックス（role と aria-checked）', () => {
    const groups = [{ heading: '共通', rows: [{ id: 'x', title: '日影', shown: true }] }] as never
    const [b] = buttonsOf(renderToStaticMarkup(createElement(MenuCheckRows, { groups, onToggle: () => undefined })))
    expect(b).not.toContain('class="btn-text"')
    expect(b).toContain('role="checkbox"')
    expect(b).toContain('aria-checked="true"')
  })
})

describe('アイコンだけのボタンは枠なし（仕様 BB2・BB3）', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8')

  it('BB3: styles.css に btn-text（枠あり）と btn-icon（枠なし）が一か所ずつある', () => {
    expect(css).toMatch(/\.btn-text\s*\{[^}]*border:\s*1px solid/)
    expect(css).toMatch(/\.btn-icon\s*\{[^}]*border:\s*none/)
  })

  it('BB2: 押せることは背景の色で示す（btn-icon の指を置いた・押した時の背景）', () => {
    expect(css).toMatch(/\.btn-icon:hover\s*\{[^}]*background/)
    expect(css).toMatch(/\.btn-icon:active\s*\{[^}]*background/)
  })
})

// 仕様 BB4（統括の指示 2026-11-06。ボリュームの表示の切り替え 3 つに枠が出て、アイコンが小さく見えた）:
// 仕様 BB4: ボリュームの道具の帯の button の規則（枠・余白・白い地）は、アイコンだけのボタン（hdr-btn）に効かない。
//           hdr-btn の枠・余白・地は、hdr-btn の規則だけで決まる（共通ヘッダーと同じ見え方）。
describe('ツールバーの button の規則は、アイコンだけのボタン（hdr-btn）に効かない（仕様 BB4）', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8')

  it('BB4: .p03-toolbar の button の規則は、hdr-btn を除く（:not(.hdr-btn)）', () => {
    expect(css).toMatch(/\.p03-toolbar button:not\(\.hdr-btn\)\s*\{/)
    expect(css).not.toMatch(/\.p03-toolbar button\s*\{/)
  })
})
