// 仕様（ハブ A-03 G69、D-04 P3）: P3 の平面（SVG。座標は mm）に、什器の層を重ねる。
// 品目を選んで区画の四角を押すと、その区画に什器を置く。置く場所は区画の中央（仮置き）。
// props: cells（区画の候補。mm）、fixtures（置いた什器）、active（品目を選んでいるとき true）、onTap（押した区画の id を渡す）、
//   onRemove（押した印の什器の id を渡す。外すのは呼び出し側）。
// 仕様 1（押せる区画）: active のとき、区画ごとに 1 つ、区画と同じ位置・大きさの押せる四角を、区画の並びで出す。押すと、その区画の id が onTap に渡る。
// 仕様 2（選んでいないとき）: active でなければ、押せる四角を出さない。
// 仕様 3（置いた什器）: 置いた什器は、品目の名前を、その区画の中央（中央揃え）に出す。
// 仕様 4（同じ区画に複数）: x は中央のまま、y は中央を中心に、置いた順に上から下へ、文字の大きさ以上の間隔で並べる。
// 仕様 5（区画なし）: 区画の指定が無い什器と、区画の一覧に無い区画の什器は、図に出さない（置く場所が無いだけで、一覧には残る）。
// 仕様 6（押しを邪魔しない）: 品目を選んでいる間（active）は、什器の文字は押せない（pointer-events: none）。文字の上を押しても区画に届き、同じ区画に続けて置ける。
// 仕様 7（描ける）: SVG の中で、サーバー側の描画で例外が出ない。
// 仕様 8（印を押すと外す・仮置き。G69）: 置いた什器の文字は、外すための印でもある。品目を選んでいないとき（active でない）は押せて、
//   押すと、その什器の id が onRemove に渡る（外すのは呼び出し側。右パネルの一覧の「外す」と同じ）。印には什器の id が付く（data-fixture）。
//   読み上げの名前は「<品目名>を外す」で、ボタンの役割を持つ。品目を選んでいる間は押せず（仕様 6）、onRemove は呼ばれない。
//   図に出ない什器（区画なし・区画の一覧に無い区画）は、印も無い。
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
  FixtureLayer({ cells: CELLS, fixtures: [], active: false, onTap: () => undefined, onRemove: () => undefined, ...props })
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

describe('FixtureLayer（印を押すと外す。仕様 8）', () => {
  // L0 に 2 つ（置いた順に fixture-1・fixture-9）、L1 に 1 つ、R0 に 1 つ。id は連番とは限らない
  const PLACED = [
    fx('fixture-1', kitchen, 'L0'),
    fx('fixture-2', toilet, 'L1'),
    fx('fixture-7', storage, 'R0'),
    fx('fixture-9', kitchen, 'L0'),
  ]
  const markOf = (marks: El[], id: string): El => {
    const found = marks.find((m) => m.props['data-fixture'] === id)
    if (!found) throw new Error(`印 ${id} が無い`)
    return found
  }
  const press = (mark: El) => (mark.props.onClick as () => void)()

  it('印には什器の id が付く（印と什器が 1 対 1）', () => {
    const marks = textsOf(render({ fixtures: PLACED }))
    expect(marks.map((m) => m.props['data-fixture']).sort()).toEqual(['fixture-1', 'fixture-2', 'fixture-7', 'fixture-9'])
  })

  it('印の id と、印の文字・位置が対応する（別々の区画は中央、同じ区画は置いた順に上から下へ）', () => {
    const marks = textsOf(render({ fixtures: PLACED }))
    expect([textOf(markOf(marks, 'fixture-2')), markOf(marks, 'fixture-2').props.x, markOf(marks, 'fixture-2').props.y]).toEqual(['便器', 4500, 3000])
    expect([textOf(markOf(marks, 'fixture-7')), markOf(marks, 'fixture-7').props.x, markOf(marks, 'fixture-7').props.y]).toEqual(['収納', 1500, 11000])
    const first = markOf(marks, 'fixture-1')
    const second = markOf(marks, 'fixture-9')
    expect([textOf(first), first.props.x]).toEqual(['キッチン', 1500])
    expect([textOf(second), second.props.x]).toEqual(['キッチン', 1500])
    expect(first.props.y as number).toBeLessThan(second.props.y as number)
    expect((first.props.y as number) + (second.props.y as number)).toBe(6000)
  })

  it('品目を選んでいないとき、印を押すと、押した印の什器の id が onRemove に 1 回だけ渡る（どの印でも）', () => {
    for (const f of PLACED) {
      const onRemove = vi.fn()
      press(markOf(textsOf(render({ active: false, fixtures: PLACED, onRemove })), f.id))
      expect(onRemove, f.id).toHaveBeenCalledTimes(1)
      expect(onRemove, f.id).toHaveBeenCalledWith(f.id)
    }
  })

  it('印を押しても、区画に置く（onTap）は呼ばれない', () => {
    const onTap = vi.fn()
    press(markOf(textsOf(render({ fixtures: PLACED, onTap })), 'fixture-1'))
    expect(onTap).not.toHaveBeenCalled()
  })

  it('品目を選んでいないとき、印は押せる（pointer-events: none ではない）', () => {
    for (const m of textsOf(render({ active: false, fixtures: PLACED }))) {
      expect(m.props.pointerEvents).not.toBe('none')
      expect(typeof m.props.onClick).toBe('function')
    }
  })

  it('品目を選んでいる間は、印は押せず（pointer-events: none）、押すためのハンドラも無い（onRemove は呼ばれない）', () => {
    const onRemove = vi.fn()
    const marks = textsOf(render({ active: true, fixtures: PLACED, onRemove }))
    expect(marks).toHaveLength(4)
    for (const m of marks) {
      expect(m.props.pointerEvents).toBe('none')
      expect(m.props.onClick).toBeUndefined()
    }
    expect(onRemove).not.toHaveBeenCalled()
  })

  it('印の読み上げの名前は「<品目名>を外す」で、ボタンの役割を持つ（押せるとき）', () => {
    const marks = textsOf(render({ fixtures: PLACED }))
    expect(markOf(marks, 'fixture-1').props['aria-label']).toBe('キッチンを外す')
    expect(markOf(marks, 'fixture-2').props['aria-label']).toBe('便器を外す')
    expect(markOf(marks, 'fixture-7').props['aria-label']).toBe('収納を外す')
    for (const m of marks) expect(m.props.role).toBe('button')
  })

  it('図に出ない什器（区画なし・区画の一覧に無い区画）には、印も無い', () => {
    const fixtures = [fx('fixture-1', kitchen, null), fx('fixture-2', toilet, 'ZZ'), fx('fixture-3', storage, 'L0')]
    expect(textsOf(render({ fixtures })).map((m) => m.props['data-fixture'])).toEqual(['fixture-3'])
  })

  it('SVG の描画で、押せる印には id が付き、品目を選んでいる間は none になる', () => {
    const draw = (active: boolean) =>
      renderToStaticMarkup(
        createElement('svg', null, createElement(FixtureLayer, { cells: CELLS, fixtures: PLACED, active, onTap: () => undefined, onRemove: () => undefined })),
      )
    const idle = draw(false)
    for (const f of PLACED) expect(idle, f.id).toContain(`data-fixture="${f.id}"`)
    expect(idle).not.toContain('pointer-events="none"')
    expect(draw(true)).toContain('pointer-events="none"')
  })
})

describe('FixtureLayer（描ける。仕様 7）', () => {
  it('SVG の中で、サーバー側の描画で例外が出ず、置いた什器が中央の座標で出る', () => {
    const html = renderToStaticMarkup(
      createElement('svg', null, createElement(FixtureLayer, { cells: CELLS, fixtures: [fx('fixture-1', kitchen, 'L0')], active: true, onTap: () => undefined, onRemove: () => undefined })),
    )
    expect(html).toContain('キッチン')
    expect(html).toContain('x="1500"')
    expect(html).toContain('y="3000"')
    expect(html).toContain('pointer-events="none"')
  })

  it('品目を選んでいるときだけ、押せる四角が描かれる', () => {
    const draw = (active: boolean) =>
      renderToStaticMarkup(createElement('svg', null, createElement(FixtureLayer, { cells: CELLS, fixtures: [], active, onTap: () => undefined, onRemove: () => undefined })))
    expect(draw(true).match(/<rect/g)).toHaveLength(3)
    expect(draw(false)).not.toContain('<rect')
  })
})
