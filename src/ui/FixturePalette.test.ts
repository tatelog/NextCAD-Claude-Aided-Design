// 仕様（ハブ A-03 G69、D-04 P2・P3）: 道具の「什器」を P3 で使えるようにする。P3 の欄は、5 品目のボタンを並べ、選んだ品目を持つ。
// 選んでいるときに区画の四角を押すと、その区画に什器を置く。置いた什器の一覧（外すボタン付き）と、種類ごとの件数を出す。文言は仮置き。
// props: selectedItem（選んでいる品目。無ければ null）、onSelect（次の選びを渡す）、fixtures（置いた什器）、
//   unitIds（いま P3 にある区画の id）、onRemove（外す什器の id を渡す）。状態は持たず、選びは呼び出し側が持つ。
// 仕様 1（欄）: 見出し「什器」の欄。ボタンは品目の並び（キッチン・ユニットバス・洗面・便器・収納）で 5 つ。
//   什器は P3 で使える道具（isToolEnabled('fixture', 'P3')）なので、ボタンは押せる。
// 仕様 2（選び方）: 押すと onSelect に次の選びを渡す。何も選んでいなければ押した品目、別の品目を押せばその品目、
//   選んでいる品目をもう一度押せば null。選んでいる品目だけ aria-pressed が true。
// 仕様 3（置いた什器の一覧）: 置いた順に 1 行ずつ「品目（区画 <id>）」を出し、各行に「外す」ボタンを付ける。押すと onRemove にその什器の id を渡す。
//   1 つも置いていなければ、一覧は出さず「まだ置いていません」と出す。
// 仕様 4（区画なし）: 区画の指定が無い什器と、いまの区画（unitIds）に無い区画の什器は、一覧から落とさず「（区画なし）」と出す。
// 仕様 5（種類ごとの件数）: 「<名前> <件数> 台」を品目の並びで 5 行（0 台を含む）。区画なしがあれば、最後に「区画なし <件数> 台」を足す。
//   品目ごとの件数に入れるのは、いまの区画にある什器だけ。
// 仕様 6（描ける）: サーバー側の描画で例外が出ない。
import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { FIXTURE_ITEMS } from '../plan/fixtures'
import type { Fixture, FixtureItem } from '../plan/fixtures'
import { isToolEnabled } from './toolAvailability'
import { FixturePalette, type FixturePaletteProps } from './FixturePalette'

const LABELS = ['キッチン', 'ユニットバス', '洗面', '便器', '収納']

function itemOf(label: string): FixtureItem {
  const found = FIXTURE_ITEMS.find((i) => i.label === label)
  if (!found) throw new Error(`品目「${label}」が無い`)
  return found.id
}

const kitchen = itemOf('キッチン')
const unitBath = itemOf('ユニットバス')
const washbasin = itemOf('洗面')
const toilet = itemOf('便器')
const storage = itemOf('収納')
const ITEMS = [kitchen, unitBath, washbasin, toilet, storage]

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
const render = (props: Partial<FixturePaletteProps> = {}): ReactElement =>
  FixturePalette({ selectedItem: null, onSelect: () => undefined, fixtures: [], unitIds: ['L0', 'L1'], onRemove: () => undefined, ...props })

// ボタンは、品目の 5 つが先、外すボタンが後（一覧の行の順）
const buttonsOf = (tree: ReactNode) => findAll(tree, isTag('button'))
const itemButtons = (tree: ReactNode) => buttonsOf(tree).slice(0, 5)
const removeButtons = (tree: ReactNode) => buttonsOf(tree).slice(5)
const listOf = (tree: ReactNode, label: string) => findAll(tree, (el) => el.type === 'ul' && el.props['aria-label'] === label)[0]
const PLACED = '置いた什器'
const COUNTS = '什器の種類ごとの件数'
const rowsOf = (tree: ReactNode, label: string) => findAll(listOf(tree, label), isTag('li')).map(textOf)

describe('FixturePalette（欄と品目のボタン。仕様 1）', () => {
  it('見出し「什器」の欄（fieldset）', () => {
    const tree = render()
    expect(tree.type).toBe('fieldset')
    expect(findAll(tree, isTag('legend')).map(textOf)).toEqual(['什器'])
  })

  it('品目のボタンが、キッチン・ユニットバス・洗面・便器・収納の順に 5 つ', () => {
    expect(itemButtons(render()).map(textOf)).toEqual(LABELS)
  })

  it('品目のボタンは type="button"（フォームの送信にしない）', () => {
    for (const b of itemButtons(render())) expect(b.props.type).toBe('button')
  })

  it('什器は P3 で使える道具なので、品目のボタンは押せる', () => {
    expect(isToolEnabled('fixture', 'P3')).toBe(true)
    for (const b of itemButtons(render())) expect(b.props.disabled).toBeFalsy()
  })
})

describe('FixturePalette（選び方。仕様 2）', () => {
  it('何も選んでいないとき、どのボタンを押しても、押した品目が onSelect に渡る', () => {
    ITEMS.forEach((item, i) => {
      const onSelect = vi.fn()
      const button = itemButtons(render({ selectedItem: null, onSelect }))[i]
      ;(button?.props.onClick as () => void)()
      expect(onSelect, item).toHaveBeenCalledTimes(1)
      expect(onSelect, item).toHaveBeenCalledWith(item)
    })
  })

  it('別の品目を押すと、その品目が渡る', () => {
    const onSelect = vi.fn()
    const toiletButton = itemButtons(render({ selectedItem: kitchen, onSelect }))[ITEMS.indexOf(toilet)]
    ;(toiletButton?.props.onClick as () => void)()
    expect(onSelect).toHaveBeenCalledWith(toilet)
  })

  it('選んでいる品目をもう一度押すと、null（選びを外す）が渡る', () => {
    const onSelect = vi.fn()
    const kitchenButton = itemButtons(render({ selectedItem: kitchen, onSelect }))[ITEMS.indexOf(kitchen)]
    ;(kitchenButton?.props.onClick as () => void)()
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('選んでいる品目のボタンだけ aria-pressed が true（何も選んでいなければ全部 false）', () => {
    const pressed = (selectedItem: FixtureItem | null) => itemButtons(render({ selectedItem })).map((b) => b.props['aria-pressed'])
    expect(pressed(null)).toEqual([false, false, false, false, false])
    expect(pressed(storage)).toEqual(ITEMS.map((i) => i === storage))
    expect(pressed(unitBath)).toEqual(ITEMS.map((i) => i === unitBath))
  })
})

describe('FixturePalette（置いた什器の一覧。仕様 3・4）', () => {
  it('1 つも置いていなければ、一覧と外すボタンは出ず、「まだ置いていません」と出る', () => {
    const tree = render({ fixtures: [] })
    expect(listOf(tree, PLACED)).toBeUndefined()
    expect(removeButtons(tree)).toHaveLength(0)
    expect(textOf(tree)).toContain('まだ置いていません')
  })

  it('置いていれば、「まだ置いていません」は出ない', () => {
    expect(textOf(render({ fixtures: [fx('fixture-1', kitchen, 'L0')] }))).not.toContain('まだ置いていません')
  })

  it('置いた順に 1 行ずつ、品目と区画を出し、各行に「外す」ボタンが付く', () => {
    const tree = render({ fixtures: [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', toilet, 'L1'), fx('fixture-3', kitchen, 'L0')] })
    expect(rowsOf(tree, PLACED)).toEqual(['キッチン（区画 L0）外す', '便器（区画 L1）外す', 'キッチン（区画 L0）外す'])
    expect(removeButtons(tree).map(textOf)).toEqual(['外す', '外す', '外す'])
  })

  it('「外す」を押すと、その行の什器の id が onRemove に渡る', () => {
    const fixtures = [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', toilet, 'L1'), fx('fixture-5', storage, 'L0')]
    fixtures.forEach((f, i) => {
      const onRemove = vi.fn()
      ;(removeButtons(render({ fixtures, onRemove }))[i]?.props.onClick as () => void)()
      expect(onRemove, f.id).toHaveBeenCalledTimes(1)
      expect(onRemove, f.id).toHaveBeenCalledWith(f.id)
    })
  })

  it('外すボタンは type="button"', () => {
    for (const b of removeButtons(render({ fixtures: [fx('fixture-1', kitchen, 'L0')] }))) expect(b.props.type).toBe('button')
  })

  it('区画の指定が無い什器と、いまの区画に無い区画の什器は、落とさず「区画なし」と出す', () => {
    const tree = render({
      unitIds: ['L0'],
      fixtures: [fx('fixture-1', kitchen, null), fx('fixture-2', storage, 'ZZ'), fx('fixture-3', toilet, 'L0')],
    })
    expect(rowsOf(tree, PLACED)).toEqual(['キッチン（区画なし）外す', '収納（区画なし）外す', '便器（区画 L0）外す'])
  })
})

describe('FixturePalette（種類ごとの件数。仕様 5）', () => {
  it('何も置いていなければ、5 品目とも 0 台で、区画なしの行は無い', () => {
    expect(rowsOf(render(), COUNTS)).toEqual(['キッチン 0 台', 'ユニットバス 0 台', '洗面 0 台', '便器 0 台', '収納 0 台'])
  })

  it('置いた分を、品目ごとに数える', () => {
    const tree = render({
      fixtures: [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', kitchen, 'L1'), fx('fixture-3', toilet, 'L0'), fx('fixture-4', washbasin, 'L1')],
    })
    expect(rowsOf(tree, COUNTS)).toEqual(['キッチン 2 台', 'ユニットバス 0 台', '洗面 1 台', '便器 1 台', '収納 0 台'])
  })

  it('区画なしの什器があれば、最後に「区画なし N 台」を足し、品目ごとの件数には入れない', () => {
    const tree = render({
      unitIds: ['L0'],
      fixtures: [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', kitchen, null), fx('fixture-3', storage, 'ZZ')],
    })
    expect(rowsOf(tree, COUNTS)).toEqual(['キッチン 1 台', 'ユニットバス 0 台', '洗面 0 台', '便器 0 台', '収納 0 台', '区画なし 2 台'])
  })

  it('区画が 1 つも無ければ、置いた什器はすべて区画なしに数える', () => {
    const tree = render({ unitIds: [], fixtures: [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', toilet, 'L1')] })
    expect(rowsOf(tree, COUNTS).at(-1)).toBe('区画なし 2 台')
    expect(rowsOf(tree, COUNTS).slice(0, 5)).toEqual(['キッチン 0 台', 'ユニットバス 0 台', '洗面 0 台', '便器 0 台', '収納 0 台'])
  })
})

describe('FixturePalette（描ける。仕様 6）', () => {
  it('サーバー側の描画で例外が出ず、品目の名前・外すボタン・件数が出る', () => {
    const html = renderToStaticMarkup(
      createElement(FixturePalette, {
        selectedItem: kitchen,
        onSelect: () => undefined,
        fixtures: [fx('fixture-1', kitchen, 'L0')],
        unitIds: ['L0'],
        onRemove: () => undefined,
      }),
    )
    for (const name of LABELS) expect(html, name).toContain(name)
    expect(html).toContain('外す')
    expect(html).toContain('キッチン（区画 L0）')
  })

  it('選んでいる品目のボタンは aria-pressed="true" で描かれる（品目のボタンの中で 1 つだけ）', () => {
    const html = renderToStaticMarkup(
      createElement(FixturePalette, { selectedItem: toilet, onSelect: () => undefined, fixtures: [], unitIds: [], onRemove: () => undefined }),
    )
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(4)
  })
})
