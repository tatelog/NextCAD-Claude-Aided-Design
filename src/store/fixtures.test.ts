// 仕様（ハブ A-03 G69、D-04 P3）: 什器の店舗。P3 で置いた什器の一覧を持ち、置く・外すの操作を持つ（zustand）。
// P3 は、5 品目のパレットで選んだ品目を持ち、選んでいるときに区画の四角を押すと、その区画に什器を置く。
// 置いた什器は P4 の数量に結ぶ。区画が無くなった什器（区画の指定が変わった後など）は、落とさず「区画なし」に数える。
// 仕様 1（初期）: 一覧は空。選んでいる品目は無い。いま P3 にある区画の id は、まだ知らされていない（null）。
// 仕様 2（選ぶ）: 品目を選べる。null で選びを外せる。選んだだけでは、一覧は変わらない。
// 仕様 3（置く）: 品目を選んで区画を押すと、選んだ品目の什器がその区画に 1 つ増える。続けて押せば続けて増える。
//         置いたあとも選びは残る。別の品目を選べば、次からはその品目が置かれる。
// 仕様 4（選んでいないとき）: 品目を選んでいなければ、区画を押しても何も置かない。
// 仕様 5（外す）: id で 1 つ外す。選んでいる品目は変わらない。
// 仕様 6（区画）: いま P3 にある区画の id を知らせられる。区画が変わっても、置いた什器は一覧から落とさない。
import { beforeEach, describe, expect, it } from 'vitest'
import { FIXTURE_ITEMS, countFixtures } from '../plan/fixtures'
import type { FixtureItem } from '../plan/fixtures'
import { useFixtures } from './fixtures'

function itemOf(label: string): FixtureItem {
  const found = FIXTURE_ITEMS.find((i) => i.label === label)
  if (!found) throw new Error(`品目「${label}」が無い`)
  return found.id
}

const kitchen = itemOf('キッチン')
const toilet = itemOf('便器')
const storage = itemOf('収納')

const state = () => useFixtures.getState()

beforeEach(() => useFixtures.setState(useFixtures.getInitialState(), true))

describe('初期（仕様 1）', () => {
  it('一覧は空、選んでいる品目は無く、区画の id はまだ知らされていない', () => {
    expect(state().fixtures).toEqual([])
    expect(state().selectedItem).toBeNull()
    expect(state().unitIds).toBeNull()
  })
})

describe('選ぶ（仕様 2）', () => {
  it('品目を選べる', () => {
    state().selectItem(kitchen)
    expect(state().selectedItem).toBe(kitchen)
  })

  it('別の品目を選ぶと、選びが替わる', () => {
    state().selectItem(kitchen)
    state().selectItem(toilet)
    expect(state().selectedItem).toBe(toilet)
  })

  it('null で選びを外せる', () => {
    state().selectItem(kitchen)
    state().selectItem(null)
    expect(state().selectedItem).toBeNull()
  })

  it('選んだだけでは、一覧は変わらない', () => {
    state().selectItem(kitchen)
    expect(state().fixtures).toEqual([])
  })
})

describe('置く（仕様 3・4）', () => {
  it('品目を選んで区画を押すと、選んだ品目の什器がその区画に 1 つ増える', () => {
    state().selectItem(kitchen)
    state().placeSelected('cell-1')
    expect(state().fixtures).toEqual([{ id: 'fixture-1', item: kitchen, unitId: 'cell-1' }])
  })

  it('続けて押すと、続けて増える（別々の区画にも、同じ区画にも）', () => {
    state().selectItem(kitchen)
    state().placeSelected('cell-1')
    state().placeSelected('cell-2')
    state().placeSelected('cell-2')
    expect(state().fixtures.map((f) => [f.id, f.item, f.unitId])).toEqual([
      ['fixture-1', kitchen, 'cell-1'],
      ['fixture-2', kitchen, 'cell-2'],
      ['fixture-3', kitchen, 'cell-2'],
    ])
  })

  it('置いたあとも、選んでいる品目は残る', () => {
    state().selectItem(kitchen)
    state().placeSelected('cell-1')
    expect(state().selectedItem).toBe(kitchen)
  })

  it('別の品目を選べば、次からはその品目が置かれる', () => {
    state().selectItem(kitchen)
    state().placeSelected('cell-1')
    state().selectItem(toilet)
    state().placeSelected('cell-1')
    expect(state().fixtures.map((f) => f.item)).toEqual([kitchen, toilet])
  })

  it('品目を選んでいなければ、区画を押しても何も置かない', () => {
    state().placeSelected('cell-1')
    expect(state().fixtures).toEqual([])
  })

  it('選びを外したあとは、区画を押しても置かない', () => {
    state().selectItem(storage)
    state().placeSelected('cell-1')
    state().selectItem(null)
    state().placeSelected('cell-1')
    expect(state().fixtures).toHaveLength(1)
  })

  it('置く前に取っていた一覧は、置いたあとも変わらない（新しい一覧になる）', () => {
    state().selectItem(kitchen)
    const before = state().fixtures
    state().placeSelected('cell-1')
    expect(before).toEqual([])
    expect(state().fixtures).not.toBe(before)
  })
})

describe('外す（仕様 5）', () => {
  it('id で指定した 1 つだけが消える', () => {
    state().selectItem(kitchen)
    state().placeSelected('cell-1')
    state().placeSelected('cell-2')
    state().placeSelected('cell-3')
    state().remove('fixture-2')
    expect(state().fixtures.map((f) => f.id)).toEqual(['fixture-1', 'fixture-3'])
  })

  it('外しても、選んでいる品目は変わらない', () => {
    state().selectItem(toilet)
    state().placeSelected('cell-1')
    state().remove('fixture-1')
    expect(state().fixtures).toEqual([])
    expect(state().selectedItem).toBe(toilet)
  })

  it('一覧に無い id を渡しても、一覧は変わらない', () => {
    state().selectItem(kitchen)
    state().placeSelected('cell-1')
    state().remove('fixture-99')
    expect(state().fixtures).toHaveLength(1)
  })
})

describe('区画（仕様 6）', () => {
  it('いま P3 にある区画の id を知らせると、持つ', () => {
    state().setUnitIds(['cell-1', 'cell-2'])
    expect(state().unitIds).toEqual(['cell-1', 'cell-2'])
  })

  it('区画の id を知らせ直すと、新しいほうに替わる', () => {
    state().setUnitIds(['cell-1', 'cell-2'])
    state().setUnitIds(['cell-5'])
    expect(state().unitIds).toEqual(['cell-5'])
  })

  it('置いた先の区画が無くなっても、什器は一覧から落とさない（数えるときに区画なしになる）', () => {
    state().setUnitIds(['cell-1', 'cell-9'])
    state().selectItem(kitchen)
    state().placeSelected('cell-1')
    state().placeSelected('cell-9')
    state().setUnitIds(['cell-1'])
    expect(state().fixtures).toHaveLength(2)
    const counts = countFixtures(state().fixtures, state().unitIds ?? undefined)
    expect(counts.byItem[kitchen]).toBe(1)
    expect(counts.unassigned).toBe(1)
  })

  it('区画の id を知らせても、一覧と選んでいる品目は変わらない', () => {
    state().selectItem(kitchen)
    state().placeSelected('cell-1')
    state().setUnitIds(['cell-1'])
    expect(state().fixtures).toHaveLength(1)
    expect(state().selectedItem).toBe(kitchen)
  })
})
