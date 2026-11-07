// 仕様: P4 の左にも左メニューを出す（ハブ A-03 G55、D-04 共通部品「左メニュー」。P2 の 2D 平面、P3、P4 に出す）。文言は仮置き。
// 代表の決定（G55）: 「図面のとき左メニューは必須。オブジェクトが何で、どんな内容が入っているかを可視化する。」
// 仕様 1（共通部品）: P4 の左に、P3 と同じ左メニュー（見出し「オブジェクト」、説明文「種類ごとの件数（平面の自動作成の結果）」）を出す。
//   左の列の幅は帯の幅（OBJECT_MENU_WIDTH = 180）で、その右に今までの本体と右パネル（360）が並ぶ。
// 仕様 2（P3 の自動作成の前）: store の plan が無いとき、件数は全部 0 で、「自動作成の後に出ます」と注記する。
// 仕様 3（P3 の自動作成の後）: plan があるとき、P3 の自動作成の結果から、P3 と同じ件数を出す（objectSourcesOfPlan）。注記は出さない。
// 仕様 4（本体はそのまま）: 左メニューを足しても、P4 の本体（見出し「P4 積算」、右パネルの「工事原価（概算）」）は今までどおり出る。
// 仕様 5（什器・仮置き。ハブ A-03 G69）: P3 で置いた什器（店舗の一覧）の数が、左メニューの「什器」の行（廊下の次・住戸の前）に出る。
//   区画なしの什器も数える。什器は自動作成の結果ではなく店舗のものなので、自動作成の前（plan が無い）でも出る（P4 の什器の欄と同じ値）。
// 仕様 6（数量の内訳は表から読む。ハブ A-03 G86「見積は明細の DB」。表が正本）:
//   数量の内訳の表は、見積の明細の表（store の lines）から出す。表に無い区分は「未拾い」と出し、自動で拾える数量があっても表に無ければ出さない。
// 描画は実物（react-dom/server の静的描画）。モックするのは、store の読み出しだけ（zustand はサーバー側の描画で初期値を返すため）。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateAutoPlan } from '../plan/autoPlan'
import { FIXTURE_ITEMS, type Fixture, type FixtureItem } from '../plan/fixtures'
import type { EstimateDetail } from '../estimate/estimateDetails'

// store の中身（試験ごとに差し替える）
const site = vi.hoisted(() => ({ state: { volume: null as unknown, plan: null as unknown } }))
vi.mock('../store/site', () => ({
  useSite: (selector: (s: typeof site.state) => unknown) => selector(site.state),
}))
// 什器の store（P3 で置いた什器の一覧と、いまの区画の id）
const fixtureStore = vi.hoisted(() => ({ state: { fixtures: [] as unknown[], unitIds: null as unknown } }))
vi.mock('../store/fixtures', () => ({
  useFixtures: (selector: (s: typeof fixtureStore.state) => unknown) => selector(fixtureStore.state),
}))
// 見積の明細の表（store の読み出し。仕様 6）
const estimateStore = vi.hoisted(() => ({ state: { lines: [] as EstimateDetail[], persisted: false } }))
vi.mock('../store/estimateLines', () => ({
  useEstimateLines: (selector: (s: typeof estimateStore.state) => unknown) => selector(estimateStore.state),
}))

import { P4Estimate } from './P4Estimate'

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

const NOTICE = '自動作成の後に出ます'
const CAPTION = '種類ごとの件数（平面の自動作成の結果）'
// 一覧の行の文字（名前 + 件数 + 注記）を、並びどおりにつないだもの
const ROWS_NO_PLAN =
  '筆界0外形0通り芯0柱0コア0縦シャフト0廊下0什器0住戸0壁0開口0部屋0'
// 中廊下（4 スパン・8 区画）: 筆界 0・外形 1・通り芯 5・コア 3・縦シャフト 10・廊下 1・什器 0・住戸 8・部屋 32（P3 と同じ件数）
const ROWS_WITH_PLAN =
  '筆界0外形1通り芯5柱0コア3縦シャフト10廊下1什器0住戸8壁0開口0部屋32'

const htmlOf = (): string => renderToStaticMarkup(createElement(P4Estimate))
// タグを除いた文字（隣り合う文字はつながる）
// 開け閉めの印（▸・▾）は aria-hidden の飾りなので文字に入れない（代表の指示『トグルでリスト化』2026-11-07）
const textOf = (html: string): string => html.replace(/<span aria-hidden="true">[^<]*<\/span>/g, '').replace(/<[^>]*>/g, '')

// 品目は名前で引く（品目の ID は仮置きなので、試験に書かない）
function itemOf(label: string): FixtureItem {
  const found = FIXTURE_ITEMS.find((i) => i.label === label)
  if (!found) throw new Error(`品目「${label}」が無い`)
  return found.id
}
const fixture = (id: string, label: string, unitId: string | null): Fixture => ({ id, item: itemOf(label), unitId })

beforeEach(() => {
  site.state = { volume: null, plan: null }
  fixtureStore.state = { fixtures: [], unitIds: null }
  estimateStore.state = { lines: [], persisted: false }
})

describe('P4 の左メニュー（共通部品。仕様 1）', () => {
  it('左に、見出し「オブジェクト」と説明文「種類ごとの件数（平面の自動作成の結果）」が出る', () => {
    const text = textOf(htmlOf())
    expect(text).toContain(`オブジェクト${CAPTION}`)
  })

  it('左の列は可変の帯幅に追従し、本体は残り幅、右パネルは360px', () => {
    expect(htmlOf()).toContain('grid-template-columns:max-content minmax(0, 1fr) 360px')
  })

  it('左メニューは本体より前（左）に出る', () => {
    const text = textOf(htmlOf())
    // 「オブジェクト」だけでは、本体の既存の文言（「対応するオブジェクトを作ってから」）にも当たるので、見出しと説明文で探す
    const menu = text.indexOf(`オブジェクト${CAPTION}`)
    expect(menu).toBeGreaterThanOrEqual(0)
    expect(menu).toBeLessThan(text.indexOf('積算 — 単価と数量'))
  })

  it('種類を選んでいないので、中身の欄は出ない', () => {
    expect(htmlOf()).not.toContain('の中身')
  })
})

describe('P4 の左メニュー（P3 の自動作成の前。仕様 2）', () => {
  it('plan が無いとき、件数は全部 0（12 種類）', () => {
    expect(textOf(htmlOf())).toContain(ROWS_NO_PLAN)
  })

  it('plan が無いとき、「自動作成の後に出ます」と注記する（説明文のすぐ下）', () => {
    expect(textOf(htmlOf())).toContain(`${CAPTION}${NOTICE}${ROWS_NO_PLAN}`)
  })
})

describe('P4 の左メニュー（P3 の自動作成の後。仕様 3）', () => {
  it('plan があるとき、P3 と同じ件数を出す（筆界 0・外形 1・通り芯 5・コア 3・縦シャフト 10・廊下 1・住戸 8・部屋 32）', () => {
    site.state = { volume: null, plan: PLAN }
    expect(textOf(htmlOf())).toContain(ROWS_WITH_PLAN)
  })

  it('plan があるとき、注記は出さない（説明文のすぐ下に一覧が続く）', () => {
    site.state = { volume: null, plan: PLAN }
    const text = textOf(htmlOf())
    expect(text).not.toContain(NOTICE)
    expect(text).toContain(`${CAPTION}${ROWS_WITH_PLAN}`)
  })
})

describe('P4 の左メニュー（P3 で置いた什器。仕様 5）', () => {
  // 3 台（区画なしの 1 台を含む）
  const placed = [fixture('fixture-1', 'キッチン', 'L0'), fixture('fixture-2', '便器', 'R3'), fixture('fixture-3', '収納', null)]

  it('plan があるとき、置いた什器の数が、廊下の次・住戸の前の「什器」の行に出る（区画なしも数える）', () => {
    site.state = { volume: null, plan: PLAN }
    fixtureStore.state = { fixtures: placed, unitIds: null }
    expect(textOf(htmlOf())).toContain(
      '筆界0外形1通り芯5柱0コア3縦シャフト10廊下1什器3住戸8壁0開口0部屋32',
    )
  })

  it('plan が無くても、置いた什器の数は出る（ほかの種類は 0 のまま、注記も出る）', () => {
    fixtureStore.state = { fixtures: placed, unitIds: null }
    const text = textOf(htmlOf())
    expect(text).toContain(
      `${CAPTION}${NOTICE}筆界0外形0通り芯0柱0コア0縦シャフト0廊下0什器3住戸0壁0開口0部屋0`,
    )
  })

  it('什器を置いていなければ、「什器」の行は 0', () => {
    site.state = { volume: null, plan: PLAN }
    expect(textOf(htmlOf())).toContain('廊下1什器0住戸8')
  })
})

describe('P4 の本体（仕様 4）', () => {
  it('左メニューを足しても、P4 の見出しと右パネルは今までどおり出る（plan の有無によらない）', () => {
    for (const plan of [null, PLAN]) {
      site.state = { volume: null, plan }
      const text = textOf(htmlOf())
      expect(text, `plan=${plan === null ? 'なし' : 'あり'}`).toContain('積算 — 単価と数量')
      expect(text, `plan=${plan === null ? 'なし' : 'あり'}`).toContain('工事原価（概算）')
    }
  })
})

describe('P4 の数量の内訳（表から読む。仕様 6・ハブ A-03 G86）', () => {
  // 床版の型枠（躯体）。金額は表に入っている値（単価 25,000 円 × 歩掛 0.3 人/m² × 90 m² = 675,000 円）
  const formwork: EstimateDetail = {
    lineId: 'slab-1/formwork',
    objectId: 'slab-1',
    category: '躯体',
    item: '型枠（床版の下面）',
    quantity: 90,
    unit: 'm2',
    unitPriceRef: 'carpenter',
    amountYen: 675000,
    provisional: true,
    source: '出典なし・仮置き',
    basis: '床版と同じ面積（支保工は含めない）',
    origin: '自動',
  }
  // 壁クロスの手入力（18 m²。オブジェクトは無い）
  const manualCross: EstimateDetail = {
    lineId: 'manual/cross',
    objectId: null,
    category: '内装',
    item: '壁クロス',
    quantity: 18,
    unit: 'm2',
    unitPriceRef: 'cross',
    amountYen: 21600,
    provisional: false,
    source: '利用者入力（出典を書く）',
    basis: '手入力（利用者が数量を入れた）',
    origin: '手入力',
  }

  it('表（ストア）に明細があれば、数量の内訳に、品目・数量・出典・金額を出す', () => {
    estimateStore.state = { lines: [formwork], persisted: true }
    const text = textOf(htmlOf())
    expect(text).toContain('型枠（床版の下面）')
    expect(text).toContain('出典: 出典なし・仮置き')
    expect(text).toContain('90 m²')
    expect(text).toContain('675,000')
  })

  // 仕様（統括の依頼 2026-11-06「単価（参照）に英語の ID（carpenter）が出る」）: 単価（参照）の欄は、単価表の品目の名前（型枠大工）を出す。ID は出さない。
  it('単価（参照）の欄は、単価表の品目の名前（型枠大工）を出し、参照の ID（carpenter）は出さない', () => {
    estimateStore.state = { lines: [formwork], persisted: true }
    const html = htmlOf()
    expect(html).toContain('<td>型枠大工</td>')
    expect(html).not.toContain('<td>carpenter</td>')
  })

  it('表が空なら、自動で拾える数量があっても、区分ごとに「未拾い」と出す（表が正本）', () => {
    site.state = { volume: null, plan: PLAN }
    estimateStore.state = { lines: [], persisted: true }
    expect(textOf(htmlOf())).toContain('内装未拾い（この区分の数量は、対応するオブジェクトを作ってから）')
  })

  it('工事原価（概算）は、表の行から出る（型枠 90 m² × 25,000 × 0.3 = 675,000 円）', () => {
    estimateStore.state = { lines: [formwork], persisted: true }
    expect(textOf(htmlOf())).toContain('675,000 円')
  })

  it('手入力の数量は、表の値を単価の行の入力欄に出し、数量の内訳に「手入力」と出す', () => {
    estimateStore.state = { lines: [manualCross], persisted: true }
    const html = htmlOf()
    expect(html).toContain('value="18"')
    expect(textOf(html)).toContain('手入力')
  })

  it('自動の数量は、表の値から「自動 N m²」と出す（型枠大工の行）', () => {
    estimateStore.state = { lines: [formwork], persisted: true }
    expect(textOf(htmlOf())).toContain('自動 90 m²')
  })
})

// 仕様 7（暗い表示でも読める。統括の依頼 2026-11-05）: 数量の内訳の表は、背景色（白）を明示する。文字色だけで地に任せない。
describe('数量の内訳の表の地（仕様 7）', () => {
  it('数量の内訳の表は、背景色（白）を明示する', () => {
    const table = htmlOf().match(/<table style="[^"]*font-size:13px[^"]*">/)
    expect(table).not.toBeNull()
    expect(table![0]).toMatch(/background(-color)?:#fff\b/)
  })
})
