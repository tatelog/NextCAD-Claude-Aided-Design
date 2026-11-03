// 仕様（ハブ A-03 G73）: 右パネルのタイルは、右上に小さな × を置く。× を押すと onHide を呼ぶ（閉じる）。中身はそのまま出す。
// 仕様 1: タイトルと中身を出し、× は「<タイトル>を閉じる」の名前を持つ。
// 仕様 2: × を押すと onHide が一度呼ばれる。
// 仕様 3: 中身（子要素）は、タイルの中にそのまま入る。
import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PanelTile } from './PanelTile'

type El = ReactElement<Record<string, unknown>>

// 要素の木から、条件に合う要素を全部集める（子は props.children をたどる）
function findAll(node: ReactNode, match: (el: El) => boolean, out: El[] = []): El[] {
  if (Array.isArray(node)) node.forEach((n) => findAll(n, match, out))
  else if (isValidElement(node)) {
    const el = node as El
    if (match(el)) out.push(el)
    findAll(el.props.children as ReactNode, match, out)
  }
  return out
}

const render = (onHide = () => undefined) =>
  PanelTile({ title: '節目の要約', onHide, children: createElement('p', null, '中身の文') }) as ReactElement

describe('PanelTile（右パネルのタイル。仕様 1〜3）', () => {
  it('仕様 1: タイトルと中身を出し、× の名前は「節目の要約を閉じる」', () => {
    const html = renderToStaticMarkup(render())
    expect(html).toContain('節目の要約')
    expect(html).toContain('中身の文')
    expect(html).toContain('aria-label="節目の要約を閉じる"')
  })

  it('仕様 2: × を押すと onHide が一度呼ばれる', () => {
    const onHide = vi.fn()
    const button = findAll(render(onHide), (el) => el.type === 'button')[0]
    expect(button).toBeDefined()
    ;(button!.props.onClick as () => void)()
    expect(onHide).toHaveBeenCalledTimes(1)
  })

  it('仕様 3: 中身はタイルの中にそのまま入る（p 要素が 1 つ）', () => {
    const paragraphs = findAll(render(), (el) => el.type === 'p')
    expect(paragraphs).toHaveLength(1)
  })
})
