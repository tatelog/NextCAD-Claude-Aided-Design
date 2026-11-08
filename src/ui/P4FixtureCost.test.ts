// 仕様（ハブ A-03 G69・G19・G22、D-04 P4）: P4 の什器の欄で、品目ごとに単価（円/台）を入れると、台数 × 単価が工事原価（概算）に入る。文言は仮置き。
// 代表の決定（G19・G22）: 工事原価（概算）の合計には、材料費・労務費などを入れる。出典のない仮置きの値は、未確定の印を付けて入れる。
// 今回の決定（仮置き）: 単価を入れた品目は、置いた台数 × 単価を合計に入れる（区画なしの什器も台数に入れる。区画は金額に関係しない）。
//   空欄の品目は合計に入れず、注記を出す。入れた分は出典なしの仮置きで、区分は「内装」。
// 仕様 1（合計に入る）: 右パネルの合計が、単価を入れた品目の 台数 × 単価 だけ増える。P3 の自動作成の結果が無くても、什器の金額が合計になる。
// 仕様 2（未確定の印）: 入れた分は出典なしの仮置きなので、右パネルに「未確定を含む」が出て、内装の小計に「※」が付く（G22）。
//   単価を入れなければ、印は付かない。
// 仕様 3（空欄は入れない）: 単価が空欄の品目は合計を変えない。単価が空欄の品目の什器を置いているときは、欄に注記を出す。
// 仕様 4（区画なし）: 区画なしの什器（区画の指定が無い・いまの区画に無い）も、単価があれば台数に入る。
// 仕様 5（入力欄）: 什器の欄に、店舗の入力欄の文字が出る。入力欄を書き換えると、店舗の setUnitPriceText が呼ばれる。
// 描画は実物（react-dom/server の静的描画）。差し替えるのは、store の読み出しだけ（zustand はサーバー側の描画で初期値を返すため）。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateAutoPlan } from '../plan/autoPlan'
import { FIXTURE_ITEMS } from '../plan/fixtures'
import type { Fixture, FixtureItem } from '../plan/fixtures'
import type { FixtureSummaryProps } from './FixtureSummary'

// store の中身（試験ごとに差し替える）
const site = vi.hoisted(() => ({ state: { volume: null as unknown, plan: null as unknown } }))
vi.mock('../store/site', () => ({
  useSite: (selector: (s: typeof site.state) => unknown) => selector(site.state),
}))
const fx = vi.hoisted(() => ({
  state: { fixtures: [] as unknown[], unitIds: null as unknown, unitPriceTexts: {} as unknown, setUnitPriceText: (() => undefined) as unknown },
}))
vi.mock('../store/fixtures', () => ({
  useFixtures: (selector: (s: typeof fx.state) => unknown) => selector(fx.state),
}))
// 見積の明細の表（store の読み出し）。工事原価は表の行から出る（G86）。SSR はエフェクトを走らせないので、自動の行は試験で直に置く
const est = vi.hoisted(() => ({ state: { lines: [] as unknown[], persisted: false } }))
vi.mock('../store/estimateLines', () => ({
  useEstimateLines: (selector: (s: typeof est.state) => unknown) => selector(est.state),
}))
// 什器の欄は実物のまま描き、受け取った props だけ控える
const summary = vi.hoisted(() => ({ props: null as unknown }))
vi.mock('./FixtureSummary', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./FixtureSummary')>()
  return {
    ...actual,
    FixtureSummary: (props: FixtureSummaryProps) => {
      summary.props = props
      return actual.FixtureSummary(props)
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
const unitBath = itemOf('ユニットバス')
const toilet = itemOf('便器')
const storage = itemOf('収納')

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

const UNPRICED_NOTE = '単価が未入力の什器は合計に入れていない（未確定）'

const htmlOf = (): string => renderToStaticMarkup(createElement(P4Estimate))
// タグを除いた文字（隣り合う文字はつながる）
// 開け閉めの印（▸・▾）は aria-hidden の飾りなので文字に入れない（代表の指示『トグルでリスト化』2026-11-07）
const textOf = (html: string): string => html.replace(/<span aria-hidden="true">[^<]*<\/span>/g, '').replace(/<[^>]*>/g, '')
// 右パネル（合計の見出しから後ろ）の文字。見出しは「計上済み金額（概算）」に変わった（Codex の版。代表の決定 2026-11-07 で今の版を正とする）。
// 「工事原価（概算）」は什器の欄の説明文にも出るので、合計の見出しで切る。画面で、キッチン 40 台に 10 万円を入れると合計が 400 万円増えることを確かめた（2026-11-08）
const panelOf = (html: string): string => {
  const text = textOf(html)
  return text.slice(text.lastIndexOf('計上済み金額（概算）'))
}
// 右パネルの合計（見出しの次に出る最初の金額）
const totalOf = (panel: string): number => {
  const m = /([\d,]+) 円/.exec(panel)
  if (!m) throw new Error('右パネルに金額が無い')
  return Number((m[1] ?? '').replace(/,/g, ''))
}

function setStore(fixtures: Fixture[], unitPriceTexts: Partial<Record<FixtureItem, string>>, unitIds: string[] | null = ['L0']): void {
  fx.state = { ...fx.state, fixtures, unitIds, unitPriceTexts }
}

beforeEach(() => {
  site.state = { volume: null, plan: null }
  fx.state = { fixtures: [], unitIds: null, unitPriceTexts: {}, setUnitPriceText: () => undefined }
  est.state = { lines: [], persisted: false }
  summary.props = null
})

describe('P4 の工事原価（単価を入れると合計に入る。仕様 1）', () => {
  it('P3 の自動作成の結果があるとき、合計が、単価を入れた品目の 台数 × 単価 だけ増える', () => {
    site.state = { volume: null, plan: PLAN }
    est.state = { lines: [AUTO_WALL], persisted: true }
    const before = totalOf(panelOf(htmlOf()))
    expect(before).toBeGreaterThan(0)
    setStore([fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', kitchen, 'L0')], { [kitchen]: '450000' })
    expect(totalOf(panelOf(htmlOf()))).toBe(before + 2 * 450000)
  })

  it('P3 の自動作成の結果が無くても、什器の金額が合計になる', () => {
    expect(totalOf(panelOf(htmlOf()))).toBe(0)
    setStore([fixture('fixture-1', toilet, 'L0'), fixture('fixture-2', toilet, 'L0'), fixture('fixture-3', toilet, 'L0')], { [toilet]: '30,000' })
    expect(totalOf(panelOf(htmlOf()))).toBe(90000)
  })

  it('単価を入れた品目が複数あれば、金額の合計が入る', () => {
    setStore([fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', toilet, 'L0'), fixture('fixture-3', toilet, 'L0')], {
      [kitchen]: '450000',
      [toilet]: '30000',
    })
    expect(totalOf(panelOf(htmlOf()))).toBe(450000 + 2 * 30000)
  })

  it('什器を外す（台数が減る）と、合計も減る', () => {
    const two = [fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', kitchen, 'L0')]
    setStore(two, { [kitchen]: '450000' })
    expect(totalOf(panelOf(htmlOf()))).toBe(900000)
    setStore(two.slice(0, 1), { [kitchen]: '450000' })
    expect(totalOf(panelOf(htmlOf()))).toBe(450000)
  })

  it('単価を入れても、台数が 0 の品目は合計を変えない', () => {
    setStore([], { [kitchen]: '450000' })
    expect(totalOf(panelOf(htmlOf()))).toBe(0)
  })
})

describe('P4 の工事原価（未確定の印。仕様 2）', () => {
  it('入れた分は出典なしの仮置きなので、右パネルに「未確定を含む」が出る', () => {
    setStore([fixture('fixture-1', kitchen, 'L0')], { [kitchen]: '450000' })
    expect(panelOf(htmlOf())).toContain('未確定を含む')
  })

  it('入れた分は内装の小計に入り、内装の小計に「※」が付く（ほかの区分には付かない）', () => {
    setStore([fixture('fixture-1', kitchen, 'L0')], { [kitchen]: '450000' })
    const panel = panelOf(htmlOf())
    expect(panel).toMatch(/内装450,000 円 ※/)
    expect(panel).toMatch(/躯体0 円(?! ※)/)
    expect(panel).toMatch(/外装0 円(?! ※)/)
    expect(panel).toMatch(/外構0 円(?! ※)/)
  })

  it('単価を入れなければ（什器を置いていても）、「未確定を含む」も「※」も付かない', () => {
    setStore([fixture('fixture-1', kitchen, 'L0')], {})
    const panel = panelOf(htmlOf())
    expect(panel).not.toContain('未確定を含む')
    expect(panel).not.toContain('※')
  })
})

describe('P4 の工事原価（空欄は入れない。仕様 3）', () => {
  it('単価が空欄の品目の什器だけなら、右パネルは変わらない', () => {
    site.state = { volume: null, plan: PLAN }
    const before = panelOf(htmlOf())
    setStore([fixture('fixture-1', unitBath, 'L0'), fixture('fixture-2', storage, 'L0')], { [unitBath]: '', [storage]: '読めない' })
    expect(panelOf(htmlOf())).toBe(before)
  })

  it('単価がある品目の分だけが入り、空欄の品目の分は入らない', () => {
    setStore([fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', unitBath, 'L0')], { [kitchen]: '450000' })
    expect(totalOf(panelOf(htmlOf()))).toBe(450000)
  })

  it('単価が空欄の品目の什器を置いているとき、什器の欄に注記「単価が未入力の什器は合計に入れていない（未確定）」を出す', () => {
    setStore([fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', unitBath, 'L0')], { [kitchen]: '450000' })
    expect(textOf(htmlOf())).toContain(UNPRICED_NOTE)
  })

  it('置いた什器がすべて単価ありのときと、什器を置いていないときは、注記を出さない', () => {
    setStore([fixture('fixture-1', kitchen, 'L0')], { [kitchen]: '450000' })
    expect(textOf(htmlOf())).not.toContain(UNPRICED_NOTE)
    setStore([], {})
    expect(textOf(htmlOf())).not.toContain(UNPRICED_NOTE)
  })
})

describe('P4 の工事原価（区画なし。仕様 4）', () => {
  it('区画の指定が無い什器と、いまの区画に無い区画の什器も、単価があれば台数に入る', () => {
    setStore([fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', kitchen, null), fixture('fixture-3', kitchen, 'L9')], { [kitchen]: '100000' })
    expect(totalOf(panelOf(htmlOf()))).toBe(300000)
  })

  it('区画の id がまだ知らされていなくても（unitIds が null）、同じ', () => {
    setStore([fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', kitchen, null)], { [kitchen]: '100000' }, null)
    expect(totalOf(panelOf(htmlOf()))).toBe(200000)
  })
})

describe('P4 の什器の欄（入力欄。仕様 5）', () => {
  it('店舗の入力欄の文字が、什器の欄の入力欄に出る', () => {
    setStore([fixture('fixture-1', kitchen, 'L0')], { [kitchen]: '450000', [toilet]: '30000' })
    const html = htmlOf()
    expect(html).toContain('value="450000"')
    expect(html).toContain('value="30000"')
    expect(textOf(html)).toContain('1 台 × 450,000 円 = 450,000 円 未確定（出典なし）')
  })

  it('什器の欄には、店舗の入力欄の文字と、書き換える関数（setUnitPriceText）がそのまま渡る', () => {
    const setter = vi.fn()
    const texts = { [kitchen]: '450000' }
    fx.state = { ...fx.state, unitPriceTexts: texts, setUnitPriceText: setter }
    htmlOf()
    const props = summary.props as FixtureSummaryProps | null
    if (!props) throw new Error('P4 の画面が、什器の欄（FixtureSummary）を描いていない')
    expect(props.unitPriceTexts).toBe(texts)
    expect(props.onUnitPriceChange).toBe(setter)
  })

  it('什器の欄の入力欄は、書き換えられる（読み取りのみにしない）', () => {
    const tag = /<input[^>]*aria-label="キッチンの単価（円\/台）"[^>]*>/.exec(htmlOf())?.[0]
    if (!tag) throw new Error('キッチンの単価の入力欄が無い')
    expect(tag).not.toContain('readonly')
  })
})
