// 仕様（ハブ A-03 G69、D-04 P3・P4）: P3 で置いた什器を P4 の数量に結ぶ。P4 に「什器（平面で置いたもの）」の欄を出す。文言は仮置き。
// 仕様 1（欄）: P4 に、見出し「什器（平面で置いたもの）」の欄が出る。什器を置いていなければ、5 品目とも 0 台。
// 仕様 2（種類ごと）: 店舗の什器を、品目ごとの台数で出す。どの行にも「単価: 未確定」が付く。
// 仕様 3（区画なし）: 店舗が知っている区画（P3 の区画の候補）に無い区画の什器は、落とさず「区画なし」に数える。区画なしが無ければ、その行は出ない。
// 仕様 4（工事原価に入れない）: 什器は、単価が決まるまで、工事原価（概算）の合計に入れない。右パネルの金額は、什器の有無で変わらない。注記で明記する。
// 仕様 5（今までどおり）: 什器の欄を足しても、P4 の見出しと右パネルは今までどおり出る。
// 描画は実物（react-dom/server の静的描画）。差し替えるのは、store の読み出しだけ（zustand はサーバー側の描画で初期値を返すため）。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateAutoPlan } from '../plan/autoPlan'
import { FIXTURE_ITEMS } from '../plan/fixtures'
import type { Fixture, FixtureItem } from '../plan/fixtures'

// store の中身（試験ごとに差し替える）
const site = vi.hoisted(() => ({ state: { volume: null as unknown, plan: null as unknown } }))
vi.mock('../store/site', () => ({
  useSite: (selector: (s: typeof site.state) => unknown) => selector(site.state),
}))
const fx = vi.hoisted(() => ({ state: { fixtures: [] as unknown[], unitIds: null as unknown } }))
vi.mock('../store/fixtures', () => ({
  useFixtures: (selector: (s: typeof fx.state) => unknown) => selector(fx.state),
}))
// 見積の明細の表（store の読み出し）。工事原価は表の行から出る（G86）。SSR はエフェクトを走らせないので、自動の行は試験で直に置く
const est = vi.hoisted(() => ({ state: { lines: [] as unknown[], persisted: false } }))
vi.mock('../store/estimateLines', () => ({
  useEstimateLines: (selector: (s: typeof est.state) => unknown) => selector(est.state),
}))

import { P4Estimate } from './P4Estimate'

function itemOf(label: string): FixtureItem {
  const found = FIXTURE_ITEMS.find((i) => i.label === label)
  if (!found) throw new Error(`品目「${label}」が無い`)
  return found.id
}

const kitchen = itemOf('キッチン')
const toilet = itemOf('便器')

const fixture = (id: string, item: FixtureItem, unitId: string | null): Fixture => ({ id, item, unitId })

// P3 の自動作成の結果（内装の数量が自動で入り、右パネルの金額が 0 円でなくなる）
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
// P3 の自動作成の結果の内装（壁クロス 100 m²）を、表の自動の行として入れたもの（単価は P4 の既定の単価表の壁クロス）
const AUTO_WALL = {
  lineId: 'room-1/cross',
  objectId: 'room-1',
  category: '内装',
  item: '壁クロス',
  quantity: 100,
  unit: 'm2',
  unitPriceRef: 'cross',
  amountYen: 120000,
  provisional: false,
  source: '計算（仮置きなし）',
  basis: '部屋の壁の面積',
  origin: '自動',
}

const HEADING = '什器（平面で置いたもの）'
const UNPRICED = '単価: 未確定'
const ZERO_ROWS = `キッチン0 台${UNPRICED}ユニットバス0 台${UNPRICED}洗面0 台${UNPRICED}便器0 台${UNPRICED}収納0 台${UNPRICED}`

const htmlOf = (): string => renderToStaticMarkup(createElement(P4Estimate))
// タグを除いた文字（隣り合う文字はつながる）
const textOf = (html: string): string => html.replace(/<[^>]*>/g, '')

beforeEach(() => {
  site.state = { volume: null, plan: null }
  fx.state = { fixtures: [], unitIds: null }
  est.state = { lines: [], persisted: false }
})

describe('P4 の什器の欄（仕様 1・2）', () => {
  it('見出し「什器（平面で置いたもの）」の欄が出る', () => {
    expect(textOf(htmlOf())).toContain(HEADING)
  })

  it('什器を置いていなければ、5 品目とも 0 台で、どの行にも「単価: 未確定」が付く', () => {
    expect(textOf(htmlOf())).toContain(`${HEADING}${ZERO_ROWS}`)
  })

  it('店舗の什器を、品目ごとの台数で出す', () => {
    fx.state = {
      fixtures: [fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', kitchen, 'L1'), fixture('fixture-3', toilet, 'L0')],
      unitIds: ['L0', 'L1'],
    }
    const text = textOf(htmlOf())
    expect(text).toContain(`キッチン2 台${UNPRICED}ユニットバス0 台${UNPRICED}洗面0 台${UNPRICED}便器1 台${UNPRICED}収納0 台${UNPRICED}`)
  })
})

describe('P4 の什器の欄（区画なし。仕様 3）', () => {
  it('区画なしが無ければ、「区画なし」の行は出ない', () => {
    fx.state = { fixtures: [fixture('fixture-1', kitchen, 'L0')], unitIds: ['L0'] }
    const text = textOf(htmlOf())
    expect(text).toContain(`キッチン1 台${UNPRICED}`)
    expect(text).not.toContain('区画なし')
  })

  it('店舗が知っている区画に無い区画の什器は、落とさず「区画なし」に数える', () => {
    fx.state = { fixtures: [fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', kitchen, 'L9')], unitIds: ['L0'] }
    const text = textOf(htmlOf())
    expect(text).toContain(`キッチン1 台${UNPRICED}`)
    expect(text).toContain('区画なし1 台')
  })

  it('区画の指定が無い（null）什器も、区画なしに数える（区画の id がまだ知らされていなくても）', () => {
    fx.state = { fixtures: [fixture('fixture-1', toilet, null)], unitIds: null }
    const text = textOf(htmlOf())
    expect(text).toContain(`便器0 台${UNPRICED}`)
    expect(text).toContain('区画なし1 台')
  })
})

describe('P4 の什器の欄（工事原価に入れない。仕様 4）', () => {
  it('注記で、什器は単価が決まるまで、工事原価（概算）の合計には入れない、と明記する', () => {
    const text = textOf(htmlOf())
    expect(text).toContain('単価が決まるまで')
    expect(text).toContain('工事原価（概算）の合計には入れない')
  })

  it('右パネル（工事原価）の中身は、什器を置いても変わらない（金額が 0 円でない入力でも）', () => {
    site.state = { volume: null, plan: PLAN }
    est.state = { lines: [AUTO_WALL], persisted: true }
    const panelOf = (html: string) => {
      const text = textOf(html)
      return text.slice(text.lastIndexOf('工事原価（概算）'))
    }
    const without = panelOf(htmlOf())
    fx.state = {
      fixtures: [fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', toilet, 'L0'), fixture('fixture-3', kitchen, null)],
      unitIds: ['L0'],
    }
    const withFixturesHtml = htmlOf()
    const withFixtures = panelOf(withFixturesHtml)
    // 什器は欄に出ている（キッチン 1 台・便器 1 台・区画なし 1 台）が、右パネルの金額は変わらない
    expect(textOf(withFixturesHtml)).toContain(`キッチン1 台${UNPRICED}ユニットバス0 台${UNPRICED}洗面0 台${UNPRICED}便器1 台${UNPRICED}`)
    expect(without).toMatch(/[1-9][\d,]* 円/)
    expect(withFixtures).toBe(without)
  })
})

describe('P4 の本体（仕様 5）', () => {
  it('什器の欄を足しても、P4 の見出しと右パネルは今までどおり出る', () => {
    fx.state = { fixtures: [fixture('fixture-1', kitchen, 'L0')], unitIds: ['L0'] }
    const text = textOf(htmlOf())
    expect(text).toContain(HEADING)
    expect(text).toContain('積算 — 単価と数量')
    expect(text).toContain('工事原価（概算）')
    expect(text).toContain('数量の内訳（区分別・自動で拾えたもの）')
  })
})
