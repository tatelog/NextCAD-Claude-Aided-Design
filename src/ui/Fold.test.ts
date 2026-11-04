// 仕様（ハブ A-03 G74「メニュー構成」・G43）: メニューは全画面で、節ごとに折りたためる。
// 仕様 1: 節の見出しは押せるボタンで、開いているかを aria-expanded で示す。見出しには節の名前を出す。
// 仕様 2: 初めは開いている（defaultOpen 省略）。開いているとき、中身を出す。
// 仕様 3: defaultOpen が false のとき、閉じた状態で始まり、中身を出さない。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Fold } from './Fold'

describe('Fold（メニューの折りたたみ節。仕様 1〜3）', () => {
  it('仕様 1・2: 既定で開き、見出しは押せるボタンで名前を出し、中身を出す', () => {
    const html = renderToStaticMarkup(createElement(Fold, { title: 'レイヤー' }, createElement('p', null, '中身の文')))
    expect(html).toContain('レイヤー')
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('中身の文')
    expect(html).toMatch(/<button[^>]*type="button"/)
  })

  it('仕様 3: defaultOpen が false のとき、閉じて始まり、中身を出さない', () => {
    const html = renderToStaticMarkup(createElement(Fold, { title: '機能', defaultOpen: false }, createElement('p', null, '中身の文')))
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('中身の文')
  })
})
