// 仕様（ハブ A-03 G69、D-04 P3・P4）: P3 で置いた什器は P4 の数量に結ぶ。P4 に「什器（P3 で置いたもの）」の欄を出す。文言は仮置き。
// props: fixtures（置いた什器）、unitIds（いま P3 にある区画の id。省略できる）。状態は持たない。
// 仕様 1（欄）: 見出し「什器（P3 で置いたもの）」の欄を出す。
// 仕様 2（種類ごと）: 5 品目それぞれ 1 行で、名前・件数（台）・「単価: 未確定」を、品目の並び（キッチン・ユニットバス・洗面・便器・収納）で出す。
//   置いていない品目は 0 台。
// 仕様 3（区画なし）: 区画なしの件数があれば、最後に「区画なし」の行（件数つき）を足す。無ければ出さない。
//   区画なしは、区画の指定が無い什器と、unitIds に無い区画の什器（落とさず数える）。unitIds を渡さなければ、区画の指定が無い什器だけ。
//   品目ごとの件数に入れるのは、区画の指定がある什器だけ。
// 仕様 4（工事原価に入れない）: 注記で、什器は単価が決まるまで、工事原価（概算）の合計には入れない、と明記する。
// 仕様 5（描ける）: サーバー側の描画で例外が出ない。
import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FIXTURE_ITEMS } from '../plan/fixtures'
import type { Fixture, FixtureItem } from '../plan/fixtures'
import { FixtureSummary, type FixtureSummaryProps } from './FixtureSummary'

function itemOf(label: string): FixtureItem {
  const found = FIXTURE_ITEMS.find((i) => i.label === label)
  if (!found) throw new Error(`品目「${label}」が無い`)
  return found.id
}

const kitchen = itemOf('キッチン')
const toilet = itemOf('便器')
const storage = itemOf('収納')
const washbasin = itemOf('洗面')

const fx = (id: string, item: FixtureItem, unitId: string | null): Fixture => ({ id, item, unitId })

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
const render = (props: Partial<FixtureSummaryProps> = {}): ReactElement => FixtureSummary({ fixtures: [], ...props })
// 表の行を、セルの文字の並びで取る
const rowsOf = (tree: ReactNode): string[][] =>
  findAll(findAll(tree, isTag('tbody'))[0], isTag('tr')).map((tr) => findAll(tr, isTag('td')).map(textOf))

const UNPRICED = '単価: 未確定'
const HEADING = '什器（P3 で置いたもの）'

describe('FixtureSummary（欄。仕様 1）', () => {
  it('見出し「什器（P3 で置いたもの）」の欄（section）を出す', () => {
    const tree = render()
    expect(tree.type).toBe('section')
    expect(tree.props).toMatchObject({ 'aria-label': HEADING })
    expect(findAll(tree, isTag('h3')).map(textOf)).toEqual([HEADING])
  })
})

describe('FixtureSummary（種類ごと。仕様 2）', () => {
  it('何も置いていなければ、5 品目とも 0 台で、どの行にも「単価: 未確定」が付く', () => {
    expect(rowsOf(render())).toEqual([
      ['キッチン', '0 台', UNPRICED],
      ['ユニットバス', '0 台', UNPRICED],
      ['洗面', '0 台', UNPRICED],
      ['便器', '0 台', UNPRICED],
      ['収納', '0 台', UNPRICED],
    ])
  })

  it('置いた什器を、品目ごとに数える（台）', () => {
    const fixtures = [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', kitchen, 'L1'), fx('fixture-3', toilet, 'L0'), fx('fixture-4', washbasin, 'L1')]
    expect(rowsOf(render({ fixtures, unitIds: ['L0', 'L1'] }))).toEqual([
      ['キッチン', '2 台', UNPRICED],
      ['ユニットバス', '0 台', UNPRICED],
      ['洗面', '1 台', UNPRICED],
      ['便器', '1 台', UNPRICED],
      ['収納', '0 台', UNPRICED],
    ])
  })
})

describe('FixtureSummary（区画なし。仕様 3）', () => {
  it('区画なしが無ければ、「区画なし」の行は出さない（5 行だけ）', () => {
    expect(rowsOf(render({ fixtures: [fx('fixture-1', kitchen, 'L0')], unitIds: ['L0'] }))).toHaveLength(5)
  })

  it('区画の指定が無い什器と、unitIds に無い区画の什器は、落とさず最後の「区画なし」の行に数える', () => {
    const fixtures = [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', kitchen, 'L1'), fx('fixture-3', storage, null)]
    const rows = rowsOf(render({ fixtures, unitIds: ['L0'] }))
    expect(rows).toHaveLength(6)
    expect(rows[0]).toEqual(['キッチン', '1 台', UNPRICED])
    expect(rows[4]).toEqual(['収納', '0 台', UNPRICED])
    expect(rows[5]?.slice(0, 2)).toEqual(['区画なし', '2 台'])
  })

  it('unitIds を渡さなければ、区画の指定が無い什器だけを区画なしに数える', () => {
    const fixtures = [fx('fixture-1', kitchen, 'L9'), fx('fixture-2', storage, null)]
    const rows = rowsOf(render({ fixtures }))
    expect(rows[0]).toEqual(['キッチン', '1 台', UNPRICED])
    expect(rows[4]).toEqual(['収納', '0 台', UNPRICED])
    expect(rows[5]?.slice(0, 2)).toEqual(['区画なし', '1 台'])
  })

  it('区画が 1 つも無ければ、置いた什器はすべて区画なしに数える', () => {
    const rows = rowsOf(render({ fixtures: [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', toilet, 'L1')], unitIds: [] }))
    expect(rows.slice(0, 5).map((r) => r[1])).toEqual(['0 台', '0 台', '0 台', '0 台', '0 台'])
    expect(rows[5]?.slice(0, 2)).toEqual(['区画なし', '2 台'])
  })
})

describe('FixtureSummary（工事原価に入れない注記。仕様 4）', () => {
  it('什器は、単価が決まるまで、工事原価（概算）の合計には入れない、と明記する', () => {
    const text = textOf(render())
    expect(text).toContain('工事原価（概算）の合計には入れない')
    expect(text).toContain('単価が決まるまで')
  })

  it('什器を置いていても、注記は出る', () => {
    const text = textOf(render({ fixtures: [fx('fixture-1', kitchen, 'L0')], unitIds: ['L0'] }))
    expect(text).toContain('工事原価（概算）の合計には入れない')
  })
})

describe('FixtureSummary（描ける。仕様 5）', () => {
  it('サーバー側の描画で例外が出ず、見出し・品目・件数・「単価: 未確定」が出る', () => {
    const html = renderToStaticMarkup(createElement(FixtureSummary, { fixtures: [fx('fixture-1', kitchen, 'L0')], unitIds: ['L0'] }))
    expect(html).toContain(HEADING)
    for (const name of ['キッチン', 'ユニットバス', '洗面', '便器', '収納']) expect(html, name).toContain(name)
    expect(html).toContain('1 台')
    expect(html.match(/単価: 未確定/g)).toHaveLength(5)
  })
})
