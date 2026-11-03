// 仕様（ハブ A-03 G69、D-04 P3・P4）: P4 の平面（2D。P3 の自動作成の部屋割りの図）に、P3 で置いた什器の印を出す。文言・見せ方は仮置き。
// 代表の決定（G69）: 道具に「什器」を追加する。置いた什器は P4 の数量に結ぶ。
// 今回の決定（仮置き）: P4 の平面に、P3 と同じ印を出す（区画の中央。区画なしは出さない）。P4 では印を押しても外さない（読み取りのみ）。
// 仕様 1（印）: 置いた什器は、品目の名前を、区画の中央に出す（P3 と同じ。FixtureLayer を使う）。印には什器の id が付く（data-fixture）。
// 仕様 2（同じ区画に複数）: x は中央のまま、y は中央を中心に、置いた順に上から下へ並べる（P3 と同じ）。
// 仕様 3（区画なし）: 区画の指定が無い什器と、平面の区画に無い区画の什器は、図に出さない（置く場所が無いだけで、什器の欄には数える）。
// 仕様 4（読み取りのみ）: P4 では印を押しても外さない。区画を押しても置かない。押せる四角も出さない。FixtureLayer へは読み取りのみ（readOnly）で渡す。
// 仕様 5（平面が無いとき）: P3 の自動作成の結果（plan）が無ければ平面が無いので、印も出ない。外形（P2）の図には出さない。
// 仕様 6（今までどおり）: 什器を置いていなければ、印は無い。平面の廊下と部屋の塗り分けは今までどおり。
// 描画は実物（react-dom/server の静的描画）。差し替えるのは、store の読み出しと、FixtureLayer へ渡した props を控えることだけ。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateAutoPlan } from '../plan/autoPlan'
import { FIXTURE_ITEMS } from '../plan/fixtures'
import type { Fixture, FixtureItem } from '../plan/fixtures'
import type { FixtureLayerProps } from './FixtureLayer'

// store の中身（試験ごとに差し替える）
const site = vi.hoisted(() => ({ state: { volume: null as unknown, plan: null as unknown } }))
vi.mock('../store/site', () => ({
  useSite: (selector: (s: typeof site.state) => unknown) => selector(site.state),
}))
const fx = vi.hoisted(() => ({
  state: {
    fixtures: [] as unknown[],
    unitIds: null as unknown,
    unitPriceTexts: {} as unknown,
    selectedItem: null as unknown,
    setUnitPriceText: (() => undefined) as unknown,
    placeSelected: (() => undefined) as unknown,
    remove: (() => undefined) as unknown,
  },
}))
vi.mock('../store/fixtures', () => ({
  useFixtures: (selector: (s: typeof fx.state) => unknown) => selector(fx.state),
}))
// 什器の層は実物のまま描き、受け取った props だけ控える
const layer = vi.hoisted(() => ({ props: null as unknown }))
vi.mock('./FixtureLayer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./FixtureLayer')>()
  return {
    ...actual,
    FixtureLayer: (props: FixtureLayerProps) => {
      layer.props = props
      return actual.FixtureLayer(props)
    },
  }
})

import { P4Estimate } from './P4Estimate'

function itemOf(label: string): FixtureItem {
  const found = FIXTURE_ITEMS.find((i) => i.label === label)
  if (!found) throw new Error(`品目「${label}」が無い`)
  return found.id
}

const kitchen = itemOf('キッチン')
const toilet = itemOf('便器')
const storage = itemOf('収納')

const fixture = (id: string, item: FixtureItem, unitId: string | null): Fixture => ({ id, item, unitId })

// P3 の自動作成の結果（中廊下・4 スパン。区画は L0〜L3・R0〜R3 の 8 つ）
const PLAN = generateAutoPlan({
  targetPerFloor: 7,
  storeyCount: 5,
  storeyHeightMm: 3000,
  spanMm: 6000,
  unitDepthMm: 6000,
  corridorMm: 1600,
  evCount: 2,
  evStops: [1, 2, 3, 4, 5],
  layout: '中廊下',
})

// P2 の外形（10 m × 8 m の矩形）
const VOLUME = {
  footprint: [
    { x: 0, y: 0 },
    { x: 10000, y: 0 },
    { x: 10000, y: 8000 },
    { x: 0, y: 8000 },
  ],
  storey_count: 5,
  storey_height: 3000,
}

const centerOf = (id: string): { x: number; y: number } => {
  const c = PLAN.cells.find((cell) => cell.id === id)
  if (!c) throw new Error(`区画 ${id} が無い`)
  return { x: (c.x0 + c.x1) / 2, y: (c.y0 + c.y1) / 2 }
}

const htmlOf = (): string => renderToStaticMarkup(createElement(P4Estimate))
// 平面の図（最初の figure）の中身。plan が無いときは、最初の figure は外形の図なので使わない
const planFigureOf = (html: string): string => {
  const start = html.indexOf('<figure')
  const end = html.indexOf('</figure>', start)
  if (start < 0 || end < 0) throw new Error('図（figure）が無い')
  return html.slice(start, end)
}

interface Mark {
  id: string
  label: string
  x: number
  y: number
  attrs: string
}
// 図の中の什器の印（text 要素。data-fixture が付いたもの）を、出てくる順に取る
const marksOf = (svg: string): Mark[] =>
  [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)]
    .map((m) => ({ attrs: m[1] ?? '', label: m[2] ?? '' }))
    .filter((m) => /data-fixture="/.test(m.attrs))
    .map((m) => ({
      id: /data-fixture="([^"]*)"/.exec(m.attrs)?.[1] ?? '',
      label: m.label,
      x: Number(/\bx="([^"]*)"/.exec(m.attrs)?.[1]),
      y: Number(/\by="([^"]*)"/.exec(m.attrs)?.[1]),
      attrs: m.attrs,
    }))

const setStore = (fixtures: Fixture[], unitIds: string[] | null = PLAN.cells.map((c) => c.id)): void => {
  fx.state = { ...fx.state, fixtures, unitIds }
}

beforeEach(() => {
  site.state = { volume: null, plan: PLAN }
  fx.state = {
    fixtures: [],
    unitIds: null,
    unitPriceTexts: {},
    selectedItem: null,
    setUnitPriceText: () => undefined,
    placeSelected: () => undefined,
    remove: () => undefined,
  }
  layer.props = null
})

describe('P4 の平面の什器の印（仕様 1・2）', () => {
  it('置いた什器の品目の名前が、区画の中央に出る', () => {
    setStore([fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', toilet, 'R2')])
    const marks = marksOf(planFigureOf(htmlOf()))
    expect(marks.map((m) => [m.label, m.x, m.y])).toEqual([
      ['キッチン', centerOf('L0').x, centerOf('L0').y],
      ['便器', centerOf('R2').x, centerOf('R2').y],
    ])
  })

  it('印には什器の id が付く（印と什器が 1 対 1）', () => {
    setStore([fixture('fixture-1', kitchen, 'L0'), fixture('fixture-4', toilet, 'R2'), fixture('fixture-9', storage, 'L3')])
    expect(marksOf(planFigureOf(htmlOf())).map((m) => m.id).sort()).toEqual(['fixture-1', 'fixture-4', 'fixture-9'])
  })

  it('同じ区画に複数あるとき、x は中央のまま、y は中央を中心に、置いた順に上から下へ並ぶ', () => {
    setStore([fixture('fixture-1', kitchen, 'L1'), fixture('fixture-2', storage, 'L1'), fixture('fixture-3', toilet, 'L1')])
    const marks = marksOf(planFigureOf(htmlOf()))
    const c = centerOf('L1')
    expect(marks.map((m) => m.label)).toEqual(['キッチン', '収納', '便器'])
    expect(marks.map((m) => m.x)).toEqual([c.x, c.x, c.x])
    expect(marks[1]?.y).toBe(c.y)
    expect((marks[0]?.y ?? 0) + (marks[2]?.y ?? 0)).toBe(2 * c.y)
    expect(marks[0]?.y).toBeLessThan(marks[1]?.y ?? 0)
    expect(marks[1]?.y).toBeLessThan(marks[2]?.y ?? 0)
  })

  it('什器の欄の台数（区画ありの数）と、図の印の数は、区画が平面にあるかぎり同じ', () => {
    setStore([fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', kitchen, 'R0'), fixture('fixture-3', toilet, 'R0')])
    const html = htmlOf()
    expect(marksOf(planFigureOf(html))).toHaveLength(3)
    expect(html.replace(/<[^>]*>/g, '')).toContain('キッチン2 台')
  })
})

describe('P4 の平面の什器の印（区画なし。仕様 3）', () => {
  it('区画の指定が無い什器と、平面の区画に無い区画の什器は、図に出さない', () => {
    setStore([fixture('fixture-1', kitchen, null), fixture('fixture-2', toilet, 'ZZ'), fixture('fixture-3', storage, 'L0')])
    expect(marksOf(planFigureOf(htmlOf())).map((m) => [m.id, m.label])).toEqual([['fixture-3', '収納']])
  })

  it('図に出ない什器も、什器の欄には「区画なし」に数える（落とさない）', () => {
    setStore([fixture('fixture-1', kitchen, null), fixture('fixture-2', toilet, 'ZZ')], PLAN.cells.map((c) => c.id))
    const html = htmlOf()
    expect(marksOf(planFigureOf(html))).toHaveLength(0)
    expect(html.replace(/<[^>]*>/g, '')).toContain('区画なし2 台')
  })
})

describe('P4 の平面の什器の印（読み取りのみ。仕様 4）', () => {
  it('印は押せない（pointer-events: none）。ボタンの役割も、「を外す」の読み上げも無い', () => {
    setStore([fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', toilet, 'R2')])
    const svg = planFigureOf(htmlOf())
    const marks = marksOf(svg)
    expect(marks).toHaveLength(2)
    for (const m of marks) expect(m.attrs).toContain('pointer-events="none"')
    expect(svg).not.toContain('role="button"')
    expect(svg).not.toContain('を外す')
  })

  it('品目を選んでいる状態でも（店舗の selectedItem があっても）、区画の押せる四角は出ない', () => {
    fx.state = { ...fx.state, selectedItem: kitchen }
    setStore([fixture('fixture-1', kitchen, 'L0')])
    const svg = planFigureOf(htmlOf())
    expect(svg).not.toContain('fill="transparent"')
    expect(svg).not.toContain('に置く')
  })

  it('FixtureLayer へは、平面の区画と置いた什器を、読み取りのみ（readOnly）で渡す', () => {
    const placed = [fixture('fixture-1', kitchen, 'L0')]
    setStore(placed)
    htmlOf()
    const props = layer.props as FixtureLayerProps | null
    if (!props) throw new Error('P4 の画面が、什器の層（FixtureLayer）を描いていない')
    expect(props.readOnly).toBe(true)
    expect(props.cells).toEqual(PLAN.cells)
    expect(props.fixtures).toEqual(placed)
    expect(props.active).toBe(false)
  })

  it('FixtureLayer に渡したハンドラを呼んでも、店舗の「外す」「置く」は呼ばれない', () => {
    const remove = vi.fn()
    const placeSelected = vi.fn()
    fx.state = { ...fx.state, remove, placeSelected }
    setStore([fixture('fixture-1', kitchen, 'L0')])
    htmlOf()
    const props = layer.props as FixtureLayerProps | null
    if (!props) throw new Error('P4 の画面が、什器の層（FixtureLayer）を描いていない')
    props.onRemove('fixture-1')
    props.onTap('L0')
    expect(remove).not.toHaveBeenCalled()
    expect(placeSelected).not.toHaveBeenCalled()
  })
})

describe('P4 の平面の什器の印（平面が無いとき。仕様 5）', () => {
  it('P3 の自動作成の結果が無ければ、印は出ない（外形だけの図にも出さない）', () => {
    site.state = { volume: VOLUME, plan: null }
    setStore([fixture('fixture-1', kitchen, 'L0')], null)
    const html = htmlOf()
    expect(html).toContain('<polygon')
    expect(html).not.toContain('data-fixture')
  })

  it('自動作成の結果と外形の両方があるとき、印は平面の図にだけ出る（外形の図には出さない）', () => {
    site.state = { volume: VOLUME, plan: PLAN }
    setStore([fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', toilet, 'R2')])
    const html = htmlOf()
    expect(html.match(/data-fixture=/g)).toHaveLength(2)
    // 図は 2 つ: 1 つ目が平面（部屋割り）、2 つ目が外形（多角形）
    const figures = html.split('<figure').slice(1)
    expect(figures).toHaveLength(2)
    expect(marksOf(figures[0] ?? '')).toHaveLength(2)
    expect(figures[1]).toContain('<polygon')
    expect(figures[1]).not.toContain('data-fixture')
  })
})

describe('P4 の平面の什器の印（今までどおり。仕様 6）', () => {
  it('什器を置いていなければ、図に印は無い', () => {
    expect(htmlOf()).not.toContain('data-fixture')
  })

  it('什器を置いても、平面の廊下と部屋の塗り分けの四角は、同じ数のまま', () => {
    const rectCount = (svg: string): number => svg.match(/<rect\b/g)?.length ?? 0
    const before = rectCount(planFigureOf(htmlOf()))
    expect(before).toBe(1 + PLAN.rooms.length)
    setStore([fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', toilet, 'R2')])
    expect(rectCount(planFigureOf(htmlOf()))).toBe(before)
  })
})
