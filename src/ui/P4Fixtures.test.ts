// 仕様（ハブ A-03 G69、D-04 P3・P4）: P3 で置いた什器を P4 の数量に結ぶ。文言は仮置き。
// Codex の版を正とする（代表の決定 2026-11-08）: P4 の中央の「什器（平面で置いたもの）」の欄（品目ごとの台数・単価: 未確定・区画なし）は外し、
//   仕様・単価の編集は CSV（仕様CSV・材料CSV）へ集約した（03b0a0e。Codex が P4FixtureCost・P4FixturePlan の試験を同じ向きに直している）。
//   置いた什器の印は平面に残る（P4FixturePlan.test.ts で確かめる）。
// 仕様 1（欄を出さない）: P4 に「什器（平面で置いたもの）」の欄・品目ごとの台数・「単価: 未確定」の行・「区画なし」の行を出さない。
// 仕様 4（工事原価に入れない）: 単価の無い什器は、工事原価（概算）の合計に入れない。右パネルの金額は、什器の有無で変わらない。注記は右の合計欄にまとめる。
// 仕様 5（今までどおり）: P4 の見出しと右パネルは出る。
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

const htmlOf = (): string => renderToStaticMarkup(createElement(P4Estimate))
// タグを除いた文字（隣り合う文字はつながる）
// 開け閉めの印（▸・▾）は aria-hidden の飾りなので文字に入れない（代表の指示『トグルでリスト化』2026-11-07）
const textOf = (html: string): string => html.replace(/<span aria-hidden="true">[^<]*<\/span>/g, '').replace(/<[^>]*>/g, '')

beforeEach(() => {
  site.state = { volume: null, plan: null }
  fx.state = { fixtures: [], unitIds: null }
  est.state = { lines: [], persisted: false }
})

describe('P4 の什器の欄（仕様 1）', () => {
  // Codex の版を正とする（代表の決定 2026-11-08）: 中央の什器の欄は外した（仕様・単価は CSV へ集約）
  it('什器を置いていなくても、置いていても、「什器（平面で置いたもの）」の欄と品目ごとの台数の行は出ない', () => {
    expect(textOf(htmlOf())).not.toContain(HEADING)
    fx.state = {
      fixtures: [fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', kitchen, 'L1'), fixture('fixture-3', toilet, 'L0')],
      unitIds: ['L0', 'L1'],
    }
    const text = textOf(htmlOf())
    expect(text).not.toContain(HEADING)
    expect(text).not.toContain(UNPRICED)
    expect(text).not.toMatch(/キッチン\d+ 台/)
    expect(text).not.toMatch(/便器\d+ 台/)
  })

  // Codex の版を正とする（代表の決定 2026-11-08）: 欄が無くなったので「区画なし」の行も出ない（什器の店舗の中身は落とさない）
  it('区画なしの什器を置いても「区画なし」の行は出ず、店舗の什器は消えない', () => {
    const placed = [fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', kitchen, 'L9'), fixture('fixture-3', toilet, null)]
    fx.state = { fixtures: placed, unitIds: ['L0'] }
    expect(textOf(htmlOf())).not.toContain('区画なし')
    expect(fx.state.fixtures).toEqual(placed)
  })
})

describe('P4 の什器（工事原価に入れない。仕様 4）', () => {
  // Codex の版を正とする（代表の決定 2026-11-08）: 注記は什器の欄から右の合計欄へ移り、「単価未入力の項目は含みません」にまとめた
  it('右の合計欄の注記で、単価未入力の項目は合計に含まない、と明記する', () => {
    const text = textOf(htmlOf())
    const panel = text.slice(text.lastIndexOf('計上済み金額（概算）'))
    expect(panel).toContain('未参照・未拾い・単価未入力の項目は含みません。')
  })

  it('右パネル（工事原価）の中身は、什器を置いても変わらない（金額が 0 円でない入力でも）', () => {
    site.state = { volume: null, plan: PLAN }
    est.state = { lines: [AUTO_WALL], persisted: true }
    const panelOf = (html: string) => {
      const text = textOf(html)
      // 合計の見出しは「計上済み金額（概算）」に変わった（Codex の版を正とする。代表 2026-11-07）
      return text.slice(text.lastIndexOf('計上済み金額（概算）'))
    }
    const without = panelOf(htmlOf())
    fx.state = {
      fixtures: [fixture('fixture-1', kitchen, 'L0'), fixture('fixture-2', toilet, 'L0'), fixture('fixture-3', kitchen, null)],
      unitIds: ['L0'],
    }
    const withFixtures = panelOf(htmlOf())
    expect(without).toMatch(/[1-9][\d,]* 円/)
    expect(withFixtures).toBe(without)
  })
})

describe('P4 の本体（仕様 5）', () => {
  // Codex の版を正とする（代表の決定 2026-11-08）: 什器の欄は無いが、P4 の見出しと右の合計欄は出る
  it('什器を置いても、P4 の見出しと右パネルが出る', () => {
    fx.state = { fixtures: [fixture('fixture-1', kitchen, 'L0')], unitIds: ['L0'] }
    const html = htmlOf()
    const text = textOf(html)
    expect(text).toContain('積算 — 単価と数量')
    expect(text).toContain('計上済み金額（概算）')
    expect(html).toContain('次へ（出力）')
    expect(text).not.toContain(HEADING)
  })
})
