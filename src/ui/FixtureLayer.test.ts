// 仕様（ハブ A-03 G69、D-04 P3）: P3 の平面（SVG。座標は mm）に、什器の層を重ねる。
// 品目を選んで区画の四角を押すと、その区画に什器を置く。置く場所は区画の中央（仮置き）。
// props: cells（区画の候補。mm）、fixtures（置いた什器）、active（品目を選んでいるとき true）、onTap（押した区画の id を渡す）。
// 仕様 1（押せる区画）: active のとき、区画ごとに 1 つ、区画と同じ位置・大きさの押せる四角を、区画の並びで出す。押すと、その区画の id が onTap に渡る。
// 仕様 2（選んでいないとき）: active でなければ、押せる四角を出さない。
// 仕様 3（置いた什器）: 置いた什器は、品目の名前を、その区画の中央（中央揃え）に出す。
// 仕様 4（同じ区画に複数）: x は中央のまま、y は中央を中心に、置いた順に上から下へ、文字の大きさ以上の間隔で並べる。
// 仕様 5（区画なし）: 区画の指定が無い什器と、区画の一覧に無い区画の什器は、図に出さない（置く場所が無いだけで、一覧には残る）。
// 仕様 6（押しを邪魔しない）: 什器の文字は押せない（pointer-events: none）。文字の上を押しても区画に届き、同じ区画に続けて置ける。
// 仕様 7（描ける）: SVG の中で、サーバー側の描画で例外が出ない。
import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Rect } from '../plan/candidateCells'
import { FIXTURE_ITEMS } from '../plan/fixtures'
import type { Fixture, FixtureItem } from '../plan/fixtures'
import { FixtureLayer, type FixtureLayerProps } from './FixtureLayer'

function itemOf(label: string): FixtureItem {
  const found = FIXTURE_ITEMS.find((i) => i.label === label)
  if (!found) throw new Error(`品目「${label}」が無い`)
  return found.id
}

const kitchen = itemOf('キッチン')
const toilet = itemOf('便器')
const storage = itemOf('収納')

// 区画: L0 の中央は (1500, 3000)、L1 は (4500, 3000)、R0 は (1500, 11000)
const CELLS: Rect[] = [
  { id: 'L0', x0: 0, y0: 0, x1: 3000, y1: 6000 },
  { id: 'L1', x0: 3000, y0: 0, x1: 6000, y1: 6000 },
  { id: 'R0', x0: 0, y0: 8000, x1: 3000, y1: 14000 },
]

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
const render = (props: Partial<FixtureLayerProps> = {}): ReactElement =>
  FixtureLayer({ cells: CELLS, fixtures: [], active: false, onTap: () => undefined, ...props })
const rectsOf = (tree: ReactNode) => findAll(tree, isTag('rect'))
const textsOf = (tree: ReactNode) => findAll(tree, isTag('text'))

describe('FixtureLayer（押せる区画。仕様 1・2）', () => {
  it('品目を選んでいるとき、区画ごとに 1 つ、区画と同じ位置・大きさの押せる四角が、区画の並びで出る', () => {
    const rects = rectsOf(render({ active: true }))
    expect(rects.map((r) => [r.props.x, r.props.y, r.props.width, r.props.height])).toEqual([
      [0, 0, 3000, 6000],
      [3000, 0, 3000, 6000],
      [0, 8000, 3000, 6000],
    ])
  })

  it('四角を押すと、その区画の id が onTap に渡る', () => {
    CELLS.forEach((cell, i) => {
      const onTap = vi.fn()
      const rect = rectsOf(render({ active: true, onTap }))[i]
      ;(rect?.props.onClick as () => void)()
      expect(onTap, cell.id).toHaveBeenCalledTimes(1)
      expect(onTap, cell.id).toHaveBeenCalledWith(cell.id)
    })
  })

  it('品目を選んでいないときは、押せる四角を出さない', () => {
    expect(rectsOf(render({ active: false }))).toHaveLength(0)
  })

  it('区画が 1 つも無ければ、品目を選んでいても何も出ない', () => {
    const tree = render({ cells: [], active: true })
    expect(rectsOf(tree)).toHaveLength(0)
    expect(textsOf(tree)).toHaveLength(0)
  })
})

describe('FixtureLayer（置いた什器の位置。仕様 3・4）', () => {
  it('品目の名前が、区画の中央に、中央揃えで出る', () => {
    const texts = textsOf(render({ fixtures: [fx('fixture-1', kitchen, 'L0')] }))
    expect(texts).toHaveLength(1)
    expect(textOf(texts[0])).toBe('キッチン')
    expect(texts[0]?.props.x).toBe(1500)
    expect(texts[0]?.props.y).toBe(3000)
    expect(texts[0]?.props.textAnchor).toBe('middle')
    expect(texts[0]?.props.dominantBaseline).toBe('central')
  })

  it('別々の区画の什器は、それぞれの区画の中央に出る', () => {
    const texts = textsOf(render({ fixtures: [fx('fixture-1', kitchen, 'L1'), fx('fixture-2', toilet, 'R0')] }))
    const byLabel = Object.fromEntries(texts.map((t) => [textOf(t), [t.props.x, t.props.y]]))
    expect(byLabel['キッチン']).toEqual([4500, 3000])
    expect(byLabel['便器']).toEqual([1500, 11000])
  })

  it('選んでいなくても（active でなくても）、置いた什器は出る', () => {
    expect(textsOf(render({ active: false, fixtures: [fx('fixture-1', storage, 'L0')] }))).toHaveLength(1)
  })

  it('同じ区画に複数あるとき、x は中央のまま、y は中央を中心に、置いた順に上から下へ、文字の大きさ以上の間隔で並ぶ', () => {
    const texts = textsOf(
      render({ fixtures: [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', storage, 'L0'), fx('fixture-3', toilet, 'L0')] }),
    )
    expect(texts.map(textOf)).toEqual(['キッチン', '収納', '便器'])
    expect(texts.map((t) => t.props.x)).toEqual([1500, 1500, 1500])
    const ys = texts.map((t) => t.props.y as number)
    expect(ys[1]).toBe(3000)
    expect(ys[0]).toBeLessThan(ys[1] as number)
    expect(ys[1]).toBeLessThan(ys[2] as number)
    expect((ys[0] as number) + (ys[2] as number)).toBe(6000)
    const fontSize = texts[0]?.props.fontSize as number
    expect((ys[1] as number) - (ys[0] as number)).toBeGreaterThanOrEqual(fontSize)
    expect((ys[2] as number) - (ys[1] as number)).toBeGreaterThanOrEqual(fontSize)
  })

  it('2 つのときも、中央を挟んで上下に分かれる（y の平均が中央）', () => {
    const ys = textsOf(render({ fixtures: [fx('fixture-1', kitchen, 'L1'), fx('fixture-2', toilet, 'L1')] })).map((t) => t.props.y as number)
    expect(ys).toHaveLength(2)
    expect((ys[0] as number) + (ys[1] as number)).toBe(6000)
    expect(ys[0]).toBeLessThan(ys[1] as number)
  })
})

describe('FixtureLayer（区画なしと、押しの邪魔。仕様 5・6）', () => {
  it('区画の指定が無い什器と、区画の一覧に無い区画の什器は、図に出さない', () => {
    const fixtures = [fx('fixture-1', kitchen, null), fx('fixture-2', toilet, 'ZZ'), fx('fixture-3', storage, 'L0')]
    const texts = textsOf(render({ fixtures }))
    expect(texts.map(textOf)).toEqual(['収納'])
  })

  it('什器の文字は押せない（pointer-events: none）', () => {
    const texts = textsOf(render({ active: true, fixtures: [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', toilet, 'L1')] }))
    expect(texts).toHaveLength(2)
    for (const t of texts) expect(t.props.pointerEvents).toBe('none')
  })
})

describe('FixtureLayer（描ける。仕様 7）', () => {
  it('SVG の中で、サーバー側の描画で例外が出ず、置いた什器が中央の座標で出る', () => {
    const html = renderToStaticMarkup(
      createElement('svg', null, createElement(FixtureLayer, { cells: CELLS, fixtures: [fx('fixture-1', kitchen, 'L0')], active: true, onTap: () => undefined })),
    )
    expect(html).toContain('キッチン')
    expect(html).toContain('x="1500"')
    expect(html).toContain('y="3000"')
    expect(html).toContain('pointer-events="none"')
  })

  it('品目を選んでいるときだけ、押せる四角が描かれる', () => {
    const draw = (active: boolean) =>
      renderToStaticMarkup(createElement('svg', null, createElement(FixtureLayer, { cells: CELLS, fixtures: [], active, onTap: () => undefined })))
    expect(draw(true).match(/<rect/g)).toHaveLength(3)
    expect(draw(false)).not.toContain('<rect')
  })
})
