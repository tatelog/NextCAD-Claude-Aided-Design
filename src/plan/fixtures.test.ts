// 仕様（ハブ A-03 G69・G13、D-04 P2・P3）: 道具の「什器」は P3 で使い、置いた什器は P4 の数量に結ぶ。
// 什器の型は id・item（種類）・unitId（区画の id。区画が無いときは null）。
// 仕様 1: パレットの品目は、キッチン・ユニットバス・洗面・便器・収納の 5 つ（この順。仮置き。パレットの中身は未決）。
// 仕様 2: 什器の kind は「その他」（'other'）、属性は「什器」（G13: 設備・階段・EV・什器は「その他」の属性）。
// 仕様 3: 置く — 種類と区画の id を渡すと、一覧に 1 つ足す。id は連番で決定論的に。
// 仕様 4: 外す — id で 1 つ消す。
// 仕様 5: 数える — 種類ごとの件数（区画の指定あり）と、区画なしの件数。
//         区画が無くなった什器（区画の指定が変わった後など）は、落とさず「区画なし」に数える。
// 仕様 6: どの操作も、入力は書き換えない。
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FIXTURE_ATTRIBUTE, FIXTURE_ITEMS, FIXTURE_KIND, countFixtures, fixtureLabel, placeFixture, removeFixture } from './fixtures'
import type { Fixture, FixtureCounts, FixtureItem } from './fixtures'

// 品目は表示名（仕様の言葉）で引く。id の綴りには依存しない。
function itemOf(label: string): FixtureItem {
  const found = FIXTURE_ITEMS.find((i) => i.label === label)
  if (!found) throw new Error(`品目「${label}」が無い`)
  return found.id
}

const kitchen = itemOf('キッチン')
const unitBath = itemOf('ユニットバス')
const toilet = itemOf('便器')
const storage = itemOf('収納')

// 中身も一覧も凍結する。書き換えようとすれば、その場で例外になる。
function freeze(list: readonly Fixture[]): readonly Fixture[] {
  return Object.freeze(list.map((f) => Object.freeze({ ...f })))
}

const sumByItem = (c: FixtureCounts): number => Object.values(c.byItem).reduce((a, b) => a + b, 0)

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('品目と、什器の kind・属性（仕様 1・2）', () => {
  it('キッチン・ユニットバス・洗面・便器・収納の 5 つが、この順に並ぶ', () => {
    expect(FIXTURE_ITEMS.map((i) => i.label)).toEqual(['キッチン', 'ユニットバス', '洗面', '便器', '収納'])
  })

  it('品目の id は重ならない', () => {
    const ids = FIXTURE_ITEMS.map((i) => i.id)
    expect(ids).toHaveLength(5)
    expect(new Set(ids).size).toBe(5)
  })

  it('品目の id から、表示名が引ける', () => {
    for (const i of FIXTURE_ITEMS) expect(fixtureLabel(i.id)).toBe(i.label)
  })

  it('什器の kind は「その他」、属性は「什器」', () => {
    expect(FIXTURE_KIND).toBe('other')
    expect(FIXTURE_ATTRIBUTE).toBe('什器')
  })
})

describe('置く（仕様 3）', () => {
  it('空の一覧に置くと、種類と区画の id を持つ什器が 1 つ入る', () => {
    expect(placeFixture([], kitchen, 'cell-1')).toEqual([{ id: 'fixture-1', item: kitchen, unitId: 'cell-1' }])
  })

  it('置くたびに 1 つずつ増え、置いた順に並ぶ', () => {
    let list: Fixture[] = []
    list = placeFixture(list, kitchen, 'cell-1')
    list = placeFixture(list, unitBath, 'cell-2')
    list = placeFixture(list, storage, 'cell-1')
    expect(list.map((f) => [f.item, f.unitId])).toEqual([
      [kitchen, 'cell-1'],
      [unitBath, 'cell-2'],
      [storage, 'cell-1'],
    ])
  })

  it('同じ区画に同じ品目を続けて置くと、別々の什器として 2 つ増える', () => {
    let list: Fixture[] = []
    list = placeFixture(list, toilet, 'cell-1')
    list = placeFixture(list, toilet, 'cell-1')
    expect(list).toHaveLength(2)
    expect(list[0]?.id).not.toBe(list[1]?.id)
  })

  it('id は連番で、置いた順に fixture-1, fixture-2, … になる', () => {
    let list: Fixture[] = []
    list = placeFixture(list, kitchen, 'cell-1')
    list = placeFixture(list, toilet, 'cell-1')
    list = placeFixture(list, kitchen, 'cell-2')
    expect(list.map((f) => f.id)).toEqual(['fixture-1', 'fixture-2', 'fixture-3'])
  })

  it('途中を外したあとに置いても、残っている什器と id が重ならない（残りの最大の番号の次になる）', () => {
    let list: Fixture[] = []
    list = placeFixture(list, kitchen, 'cell-1')
    list = placeFixture(list, toilet, 'cell-1')
    list = placeFixture(list, storage, 'cell-1')
    list = removeFixture(list, 'fixture-1')
    list = placeFixture(list, kitchen, 'cell-2')
    const ids = list.map((f) => f.id)
    expect(ids).toEqual(['fixture-2', 'fixture-3', 'fixture-4'])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('時刻や乱数が変わっても、同じ操作は同じ結果になる（決定論的）', () => {
    const run = () => placeFixture(placeFixture([], kitchen, 'cell-1'), toilet, 'cell-2')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-04T00:00:00Z'))
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const first = run()
    vi.setSystemTime(new Date('2026-11-08T11:00:00Z'))
    random.mockReturnValue(0.9)
    const second = run()
    expect(second).toEqual(first)
  })
})

describe('外す（仕様 4）', () => {
  const three: Fixture[] = [
    { id: 'fixture-1', item: kitchen, unitId: 'cell-1' },
    { id: 'fixture-2', item: kitchen, unitId: 'cell-1' },
    { id: 'fixture-3', item: toilet, unitId: 'cell-2' },
  ]

  it('id で指定した 1 つだけが消え、残りは順序を保つ', () => {
    expect(removeFixture(three, 'fixture-2').map((f) => f.id)).toEqual(['fixture-1', 'fixture-3'])
  })

  it('同じ区画・同じ品目の什器が複数あっても、指定した id の 1 つだけを消す', () => {
    const out = removeFixture(three, 'fixture-1')
    expect(out.filter((f) => f.item === kitchen && f.unitId === 'cell-1').map((f) => f.id)).toEqual(['fixture-2'])
  })

  it('一覧に無い id を渡しても、一覧は変わらない', () => {
    expect(removeFixture(three, 'fixture-99')).toEqual(three)
  })

  it('全部外すと、空になる', () => {
    let list: readonly Fixture[] = three
    for (const f of three) list = removeFixture(list, f.id)
    expect(list).toEqual([])
  })
})

describe('数える（仕様 5）', () => {
  it('何も置いていなければ、5 品目とも 0 件で、区画なしも 0 件', () => {
    const c = countFixtures([])
    expect(Object.keys(c.byItem).sort()).toEqual(FIXTURE_ITEMS.map((i) => i.id).sort())
    expect(Object.values(c.byItem).every((n) => n === 0)).toBe(true)
    expect(c.unassigned).toBe(0)
  })

  it('区画の指定がある什器を、種類ごとに数える', () => {
    const list: Fixture[] = [
      { id: 'fixture-1', item: kitchen, unitId: 'cell-1' },
      { id: 'fixture-2', item: kitchen, unitId: 'cell-2' },
      { id: 'fixture-3', item: toilet, unitId: 'cell-1' },
    ]
    const c = countFixtures(list)
    expect(c.byItem[kitchen]).toBe(2)
    expect(c.byItem[toilet]).toBe(1)
    expect(c.byItem[unitBath]).toBe(0)
    expect(c.byItem[storage]).toBe(0)
    expect(c.unassigned).toBe(0)
  })

  it('区画の id が null の什器は、種類ごとには数えず、区画なしに数える（落とさない）', () => {
    const list: Fixture[] = [
      { id: 'fixture-1', item: kitchen, unitId: 'cell-1' },
      { id: 'fixture-2', item: kitchen, unitId: null },
      { id: 'fixture-3', item: storage, unitId: null },
    ]
    const c = countFixtures(list)
    expect(c.byItem[kitchen]).toBe(1)
    expect(c.byItem[storage]).toBe(0)
    expect(c.unassigned).toBe(2)
  })

  it('現在ある区画の id を渡すと、その中に無い区画の什器は、落とさず区画なしに数える', () => {
    const list: Fixture[] = [
      { id: 'fixture-1', item: kitchen, unitId: 'cell-1' },
      { id: 'fixture-2', item: kitchen, unitId: 'cell-9' },
      { id: 'fixture-3', item: unitBath, unitId: 'cell-9' },
    ]
    const c = countFixtures(list, ['cell-1', 'cell-2'])
    expect(c.byItem[kitchen]).toBe(1)
    expect(c.byItem[unitBath]).toBe(0)
    expect(c.unassigned).toBe(2)
  })

  it('現在ある区画の id を渡しても、その中にある区画の什器は、種類ごとに数える', () => {
    const list: Fixture[] = [
      { id: 'fixture-1', item: toilet, unitId: 'cell-2' },
      { id: 'fixture-2', item: toilet, unitId: 'cell-1' },
    ]
    const c = countFixtures(list, ['cell-1', 'cell-2'])
    expect(c.byItem[toilet]).toBe(2)
    expect(c.unassigned).toBe(0)
  })

  it('現在ある区画が 1 つも無ければ、区画の指定があった什器もすべて区画なしに数える', () => {
    const list: Fixture[] = [
      { id: 'fixture-1', item: kitchen, unitId: 'cell-1' },
      { id: 'fixture-2', item: toilet, unitId: 'cell-2' },
    ]
    const c = countFixtures(list, [])
    expect(sumByItem(c)).toBe(0)
    expect(c.unassigned).toBe(2)
  })

  it('種類ごとの件数の合計 + 区画なし = 一覧の件数（どの什器も落とさない）', () => {
    const list: Fixture[] = [
      { id: 'fixture-1', item: kitchen, unitId: 'cell-1' },
      { id: 'fixture-2', item: unitBath, unitId: null },
      { id: 'fixture-3', item: toilet, unitId: 'cell-9' },
      { id: 'fixture-4', item: storage, unitId: 'cell-2' },
    ]
    for (const units of [undefined, ['cell-1'], ['cell-1', 'cell-2'], []]) {
      const c = countFixtures(list, units)
      expect(sumByItem(c) + c.unassigned).toBe(list.length)
    }
  })
})

describe('入力は書き換えない（仕様 6）', () => {
  const base: Fixture[] = [
    { id: 'fixture-1', item: kitchen, unitId: 'cell-1' },
    { id: 'fixture-2', item: toilet, unitId: null },
  ]

  it('置く', () => {
    const input = freeze(base)
    const before = JSON.stringify(input)
    const out = placeFixture(input, storage, 'cell-2')
    expect(JSON.stringify(input)).toBe(before)
    expect(out).not.toBe(input)
    expect(out).toHaveLength(3)
  })

  it('外す', () => {
    const input = freeze(base)
    const before = JSON.stringify(input)
    const out = removeFixture(input, 'fixture-1')
    expect(JSON.stringify(input)).toBe(before)
    expect(out).not.toBe(input)
    expect(out).toHaveLength(1)
  })

  it('数える（現在ある区画の id も書き換えない）', () => {
    const input = freeze(base)
    const units = Object.freeze(['cell-1', 'cell-2'])
    const before = JSON.stringify([input, units])
    countFixtures(input, units)
    expect(JSON.stringify([input, units])).toBe(before)
  })
})
