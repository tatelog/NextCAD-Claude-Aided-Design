// 仕様（ハブ A-03 G13・G14・G65、D-04 共通部品「意味づけの結果表示」「要確認の修正」）: P3 の右パネルの末尾に出す節「意味づけの確認（G14）」。文言は仮置き。
// 判断は聞き返さない。結果はそのまま入り、右側で「これでいいか」をまとめて確認する。変えたければ選択肢で選ぶ。いちいち確定させない。
// props: rows（確認欄の行。F5・F9 の線だけ。線の並びのまま）、onSelectKind（種類を選んだ。未分類を選んだら kind は null）、
//   onConfirm（要確認の行の「この種類で確定」。種類は変えない）。状態は持たず、値は呼び出し側（店舗）が持つ。
// 仕様 1（節）: 見出し「意味づけの確認（G14）」の欄（fieldset）。
// 仕様 2（注記）: 節の中に「判定（Claude）は未接続。種類は人が選ぶ」を一行出す（線が無くても出す）。
// 仕様 3（件数）: 「未分類 N 件」「要確認 N 件」「確定 N 件」を、この順に出す（0 件も出す）。
// 仕様 4（一覧）: 行ごとに 1 項目、渡された並びのまま。各行は 線の id（長いときは先頭 8 文字。全体は title に持つ）・種類を選ぶ select・状態の印を持つ。
//   select は 未分類と 7 種（壁・柱・梁・開口・通り芯・部屋・その他）で、いまの種類を選んだ状態にする（種類が無ければ未分類）。
//   行が多いときは一覧がスクロールできる。
// 仕様 5（選ぶ）: select で選ぶと onSelectKind にその行の id と選んだ種類を渡す。未分類を選んだら kind は null。
// 仕様 6（この種類で確定）: 状態が要確認の行にだけ「この種類で確定」のボタンを出す。押すと onConfirm にその行の id と、いまの種類を渡す。
//   確定・未分類の行には出さない。
// 仕様 7（線が無いとき）: 一覧は出さず、その旨を出す。件数と注記は出す。
// 仕様 8（描ける）: サーバー側の描画で例外が出ない。
import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Kind } from '../plan/semantic'
import type { ConfirmRow, ConfirmStatus } from '../plan/semanticConfirm'
import { SemanticConfirm, type SemanticConfirmProps } from './SemanticConfirm'

const KIND_NAMES: Record<Kind, string> = {
  wall: '壁',
  column: '柱',
  beam: '梁',
  opening: '開口',
  grid: '通り芯',
  room: '部屋',
  other: 'その他',
}
const OPTION_NAMES = ['未分類', '壁', '柱', '梁', '開口', '通り芯', '部屋', 'その他']
const OPTION_VALUES = ['', 'wall', 'column', 'beam', 'opening', 'grid', 'room', 'other']

const row = (id: string, kind: Kind | null, status: ConfirmStatus): ConfirmRow => ({
  id,
  kind,
  kindName: kind === null ? '未分類' : KIND_NAMES[kind],
  status,
})

type El = ReactElement<{ children?: ReactNode } & Record<string, unknown>>

// 関数コンポーネントの返り値（要素の木）から、条件に合う要素を、出てくる順に集める
function findAll(node: ReactNode, match: (el: El) => boolean, out: El[] = []): El[] {
  if (Array.isArray(node)) {
    for (const n of node) findAll(n as ReactNode, match, out)
  } else if (isValidElement<El['props']>(node)) {
    if (match(node as El)) out.push(node as El)
    findAll(node.props.children, match, out)
  }
  return out
}

// 要素の木の文字（子の文字を順につなぐ）
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map((n) => textOf(n as ReactNode)).join('')
  if (isValidElement<El['props']>(node)) return textOf(node.props.children)
  return ''
}

const isTag = (tag: string) => (el: El) => el.type === tag
const render = (props: Partial<SemanticConfirmProps> = {}): ReactElement =>
  SemanticConfirm({ rows: [], onSelectKind: () => undefined, onConfirm: () => undefined, ...props })

const listOf = (tree: ReactNode, label: string) => findAll(tree, (el) => el.type === 'ul' && el.props['aria-label'] === label)[0]
const COUNTS = '意味づけの件数'
const LIST = '意味づけの確認の一覧'
const countsOf = (tree: ReactNode) => findAll(listOf(tree, COUNTS), isTag('li')).map(textOf)
const itemsOf = (tree: ReactNode) => findAll(listOf(tree, LIST), isTag('li'))
const selectOf = (li: ReactNode) => findAll(li, isTag('select'))[0]
const buttonsOf = (li: ReactNode) => findAll(li, isTag('button'))
const spansOf = (li: ReactNode) => findAll(li, isTag('span')).map(textOf)

// 6 本: 未分類 2・要確認 1・確定 3
const SIX: ConfirmRow[] = [
  row('s1', null, 'unclassified'),
  row('s2', 'wall', 'confirmed'),
  row('s3', 'column', 'needs_review'),
  row('s4', 'beam', 'confirmed'),
  row('s5', null, 'unclassified'),
  row('s6', 'room', 'confirmed'),
]

describe('SemanticConfirm（節と注記。仕様 1・2）', () => {
  it('見出し「意味づけの確認（G14）」の欄（fieldset）', () => {
    const tree = render()
    expect(tree.type).toBe('fieldset')
    expect(findAll(tree, isTag('legend')).map(textOf)).toEqual(['意味づけの確認（G14）'])
  })

  it('節の中に「判定（Claude）は、ヘッダーの「意味づけを判定」で送る。」が出る', () => {
    expect(textOf(render({ rows: SIX }))).toContain('判定（Claude）は、ヘッダーの「意味づけを判定」で送る。結果は要確認の提案として入る。種類は人が選ぶ')
  })

  it('線が無くても、注記は出る', () => {
    expect(textOf(render({ rows: [] }))).toContain('判定（Claude）は、ヘッダーの「意味づけを判定」で送る。結果は要確認の提案として入る。種類は人が選ぶ')
  })
})

describe('SemanticConfirm（件数。仕様 3）', () => {
  it('未分類・要確認・確定の件数を、この順に出す', () => {
    expect(countsOf(render({ rows: SIX }))).toEqual(['未分類 2 件', '要確認 1 件', '確定 3 件'])
  })

  it('線が無ければ、3 つとも 0 件', () => {
    expect(countsOf(render({ rows: [] }))).toEqual(['未分類 0 件', '要確認 0 件', '確定 0 件'])
  })

  it('1 つの状態だけでも、ほかの 2 つは 0 件で出る', () => {
    expect(countsOf(render({ rows: [row('a', 'beam', 'needs_review'), row('b', 'wall', 'needs_review')] }))).toEqual([
      '未分類 0 件',
      '要確認 2 件',
      '確定 0 件',
    ])
  })
})

describe('SemanticConfirm（一覧。仕様 4）', () => {
  it('行ごとに 1 項目、渡された並びのまま', () => {
    const tree = render({ rows: SIX })
    expect(itemsOf(tree)).toHaveLength(6)
    expect(itemsOf(tree).map((li) => spansOf(li)[0])).toEqual(['線 s1', '線 s2', '線 s3', '線 s4', '線 s5', '線 s6'])
  })

  it('各行に select が 1 つ。選択肢は 未分類と 7 種（壁・柱・梁・開口・通り芯・部屋・その他）の順', () => {
    for (const li of itemsOf(render({ rows: SIX }))) {
      expect(findAll(li, isTag('select'))).toHaveLength(1)
      const options = findAll(selectOf(li), isTag('option'))
      expect(options.map(textOf)).toEqual(OPTION_NAMES)
      expect(options.map((o) => o.props.value)).toEqual(OPTION_VALUES)
    }
  })

  it('select はいまの種類を選んだ状態。種類が無い行は未分類', () => {
    const tree = render({ rows: SIX })
    expect(itemsOf(tree).map((li) => selectOf(li)?.props.value)).toEqual(['', 'wall', 'column', 'beam', '', 'room'])
  })

  it('要確認の行も、種類は残して選んだ状態にする', () => {
    const li = itemsOf(render({ rows: [row('a', 'opening', 'needs_review')] }))[0]
    expect(selectOf(li)?.props.value).toBe('opening')
  })

  it('各行の状態の印は、未分類・要確認・確定の名前', () => {
    const tree = render({ rows: SIX })
    expect(itemsOf(tree).map((li) => spansOf(li)[1])).toEqual(['未分類', '確定', '要確認', '確定', '未分類', '確定'])
  })

  it('各行の select には、どの線の種類かが分かる名前（aria-label）が付く', () => {
    const labels = itemsOf(render({ rows: SIX })).map((li) => selectOf(li)?.props['aria-label'])
    expect(labels).toEqual(['線 s1 の種類', '線 s2 の種類', '線 s3 の種類', '線 s4 の種類', '線 s5 の種類', '線 s6 の種類'])
  })

  it('id が長いときは先頭 8 文字だけを出し、全体は title に持つ', () => {
    const id = 'abcdef01-2345-6789-abcd-ef0123456789'
    const li = itemsOf(render({ rows: [row(id, null, 'unclassified')] }))[0]
    const idSpan = findAll(li, isTag('span'))[0]
    expect(textOf(idSpan)).toBe('線 abcdef01')
    expect(idSpan?.props.title).toBe(id)
  })

  it('行が多いときは、一覧がスクロールできる（高さの上限と overflowY）', () => {
    const many = Array.from({ length: 60 }, (_, i) => row(`s${i}`, null, 'unclassified'))
    const ul = listOf(render({ rows: many }), LIST)
    const style = ul?.props.style as { maxHeight?: unknown; overflowY?: unknown }
    expect(typeof style.maxHeight).toBe('number')
    expect(style.maxHeight as number).toBeGreaterThan(0)
    expect(['auto', 'scroll']).toContain(style.overflowY)
    expect(itemsOf(render({ rows: many }))).toHaveLength(60)
  })
})

describe('SemanticConfirm（種類を選ぶ。仕様 5）', () => {
  it('select で種類を選ぶと、その行の id と選んだ種類が onSelectKind に渡る', () => {
    const onSelectKind = vi.fn()
    const items = itemsOf(render({ rows: SIX, onSelectKind }))
    const onChange = selectOf(items[3])?.props.onChange as (e: { target: { value: string } }) => void
    onChange({ target: { value: 'grid' } })
    expect(onSelectKind).toHaveBeenCalledTimes(1)
    expect(onSelectKind).toHaveBeenCalledWith('s4', 'grid')
  })

  it.each(OPTION_VALUES.slice(1))('選択肢 %s を選べる', (value) => {
    const onSelectKind = vi.fn()
    const items = itemsOf(render({ rows: [row('s1', null, 'unclassified')], onSelectKind }))
    ;(selectOf(items[0])?.props.onChange as (e: { target: { value: string } }) => void)({ target: { value } })
    expect(onSelectKind).toHaveBeenCalledWith('s1', value)
  })

  it('未分類を選ぶと、kind は null で渡る', () => {
    const onSelectKind = vi.fn()
    const items = itemsOf(render({ rows: [row('s2', 'wall', 'confirmed')], onSelectKind }))
    ;(selectOf(items[0])?.props.onChange as (e: { target: { value: string } }) => void)({ target: { value: '' } })
    expect(onSelectKind).toHaveBeenCalledWith('s2', null)
  })

  it('行ごとに自分の id で呼ぶ', () => {
    const onSelectKind = vi.fn()
    const items = itemsOf(render({ rows: SIX, onSelectKind }))
    items.forEach((li, i) => {
      ;(selectOf(li)?.props.onChange as (e: { target: { value: string } }) => void)({ target: { value: 'other' } })
      expect(onSelectKind).toHaveBeenLastCalledWith(`s${i + 1}`, 'other')
    })
  })
})

describe('SemanticConfirm（この種類で確定。仕様 6）', () => {
  it('要確認の行にだけ「この種類で確定」のボタンが出る', () => {
    const items = itemsOf(render({ rows: SIX }))
    expect(items.map((li) => buttonsOf(li).map(textOf))).toEqual([[], [], ['この種類で確定'], [], [], []])
  })

  it('押すと、その行の id と、いまの種類が onConfirm に渡る。種類は変えない', () => {
    const onConfirm = vi.fn()
    const onSelectKind = vi.fn()
    const items = itemsOf(render({ rows: SIX, onConfirm, onSelectKind }))
    ;(buttonsOf(items[2])[0]?.props.onClick as () => void)()
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith('s3', 'column')
    expect(onSelectKind).not.toHaveBeenCalled()
  })

  it('要確認の行が複数あれば、それぞれの行に出て、自分の id と種類で呼ぶ', () => {
    const onConfirm = vi.fn()
    const rows = [row('a', 'wall', 'needs_review'), row('b', 'beam', 'confirmed'), row('c', 'room', 'needs_review')]
    const items = itemsOf(render({ rows, onConfirm }))
    ;(buttonsOf(items[0])[0]?.props.onClick as () => void)()
    ;(buttonsOf(items[2])[0]?.props.onClick as () => void)()
    expect(onConfirm.mock.calls).toEqual([
      ['a', 'wall'],
      ['c', 'room'],
    ])
  })

  it('ボタンは type="button"（フォームの送信にしない）', () => {
    const items = itemsOf(render({ rows: [row('a', 'wall', 'needs_review')] }))
    expect(buttonsOf(items[0])[0]?.props.type).toBe('button')
  })

  it('確定の行・未分類の行には出ない', () => {
    const items = itemsOf(render({ rows: [row('a', 'wall', 'confirmed'), row('b', null, 'unclassified')] }))
    for (const li of items) expect(buttonsOf(li)).toHaveLength(0)
  })

  it('節の中のボタンは、要確認の行の分だけ', () => {
    expect(findAll(render({ rows: SIX }), isTag('button'))).toHaveLength(1)
    expect(findAll(render({ rows: [] }), isTag('button'))).toHaveLength(0)
  })
})

describe('SemanticConfirm（線が無いとき。仕様 7）', () => {
  it('一覧は出さず、対象の線（F5・F9）がまだ無いことを出す', () => {
    const tree = render({ rows: [] })
    expect(listOf(tree, LIST)).toBeUndefined()
    expect(textOf(tree)).toContain('対象の線（F5・F9）がまだありません')
  })

  it('線があれば、その表示は出ない', () => {
    expect(textOf(render({ rows: SIX }))).not.toContain('がまだありません')
  })
})

describe('SemanticConfirm（描ける。仕様 8）', () => {
  it('サーバー側の描画で例外が出ず、節の名前・注記・件数・状態・ボタンが出る', () => {
    const html = renderToStaticMarkup(createElement(SemanticConfirm, { rows: SIX, onSelectKind: () => undefined, onConfirm: () => undefined }))
    expect(html).toContain('意味づけの確認（G14）')
    expect(html).toContain('判定（Claude）は、ヘッダーの「意味づけを判定」で送る。結果は要確認の提案として入る。種類は人が選ぶ')
    expect(html).toContain('未分類 2 件')
    expect(html).toContain('要確認 1 件')
    expect(html).toContain('確定 3 件')
    expect(html).toContain('この種類で確定')
  })

  it('select は、いまの種類の選択肢が選ばれた状態で描かれる', () => {
    const html = renderToStaticMarkup(
      createElement(SemanticConfirm, { rows: [row('a', 'beam', 'confirmed')], onSelectKind: () => undefined, onConfirm: () => undefined }),
    )
    expect(html).toMatch(/<option value="beam" selected="">梁<\/option>/)
    expect(html.match(/selected=""/g)).toHaveLength(1)
  })

  it('種類が無い行は、未分類の選択肢が選ばれた状態で描かれる', () => {
    const html = renderToStaticMarkup(
      createElement(SemanticConfirm, { rows: [row('a', null, 'unclassified')], onSelectKind: () => undefined, onConfirm: () => undefined }),
    )
    expect(html).toMatch(/<option value="" selected="">未分類<\/option>/)
    expect(html.match(/selected=""/g)).toHaveLength(1)
  })

  it('線が無くても例外が出ない', () => {
    const html = renderToStaticMarkup(createElement(SemanticConfirm, { rows: [], onSelectKind: () => undefined, onConfirm: () => undefined }))
    expect(html).toContain('意味づけの確認（G14）')
    expect(html).toContain('がまだありません')
  })
})
