// 仕様（ハブ A-03 G95・G96・G97・G14。統括の依頼 t55、2026-11-04）: 右パネルの「Claude（チャット）」の項目。
// 仕様 1（未接続・入力）: 返信の仕組みが無いときは、未接続の注記を出し、自由な文の入力欄と「送る」を出す（G96）。
// 仕様 2（選択肢）: 最後の返答が質問なら、選択肢をボタンで出す（G96）。選んだあとは出さない。
// 仕様 3（変更と戻す）: 反映した変更の説明を出し、「変更を戻す」を出す（G97・G14）。
// 仕様 4（送信中）: 送信中は「送る」を押せない。
// 描画は実物（react-dom/server の静的描画）。差し替えるのは、store の読み出しだけ（zustand はサーバー側の描画で初期値を返すため）。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const chat = vi.hoisted(() => ({
  state: {
    messages: [] as unknown[],
    sending: false,
    notice: null as string | null,
    undo: null as unknown,
    transport: null as unknown,
  },
}))
vi.mock('../store/chat', () => ({
  useChat: (selector: (s: typeof chat.state) => unknown) => selector(chat.state),
}))

import { ChatTile } from './ChatTile'

const htmlOf = (): string => renderToStaticMarkup(createElement(ChatTile, { screen: 'P3' }))
const textOf = (html: string): string => html.replace(/<[^>]*>/g, '')

beforeEach(() => {
  chat.state = { messages: [], sending: false, notice: null, undo: null, transport: null }
})

describe('未接続と入力（仕様 1）', () => {
  it('未接続の注記と、自由な文の入力欄・「送る」を出す', () => {
    chat.state.notice = '未接続: 返信の仕組みが未設定です'
    const html = htmlOf()
    expect(textOf(html)).toContain('未接続')
    expect(html).toContain('<textarea')
    // 「送る」は紙飛行機のアイコンのボタンになり、名前（aria-label）で「送る」を持つ（Codex の版を正とする。代表 2026-11-07）
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*aria-label="送る"/)
  })
})

describe('選択肢（仕様 2）', () => {
  it('最後の返答が質問なら、選択肢をボタンで出す', () => {
    chat.state.messages = [
      { id: 1, role: 'user', text: '直して' },
      { id: 2, role: 'claude', text: 'どちらですか', choices: ['壁', '柱'] },
    ]
    const html = htmlOf()
    expect(html).toMatch(/<button[^>]*>壁<\/button>/)
    expect(html).toMatch(/<button[^>]*>柱<\/button>/)
  })

  it('選んだあと（最後が利用者の文）は、選択肢を出さない', () => {
    chat.state.messages = [
      { id: 1, role: 'claude', text: 'どちらですか', choices: ['壁', '柱'] },
      { id: 2, role: 'user', text: '壁' },
    ]
    expect(htmlOf()).not.toMatch(/<button[^>]*>壁<\/button>/)
  })
})

describe('変更と戻す（仕様 3）', () => {
  it('反映した変更の説明と「変更を戻す」を出す', () => {
    chat.state.undo = { snapshot: {}, summary: ['階数を 5 にする'] }
    const html = htmlOf()
    expect(textOf(html)).toContain('階数を 5 にする')
    expect(html).toMatch(/<button[^>]*>変更を戻す<\/button>/)
  })

  it('戻せる変更が無ければ「変更を戻す」は出さない', () => {
    expect(htmlOf()).not.toContain('変更を戻す')
  })
})

describe('送信中（仕様 4）', () => {
  it('送信中は「送る」を押せない', () => {
    chat.state.sending = true
    // 名前「送る」のボタンが押せない（disabled）。属性の並びに依らず、送るのボタンの開きタグで確かめる
    const button = htmlOf().match(/<button[^>]*aria-label="送る"[^>]*>/)?.[0] ?? ''
    expect(button).toContain('disabled=""')
  })
})
