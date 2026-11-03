// 仕様: P4 の左にも左メニューを出す（ハブ A-03 G55、D-04 共通部品「左メニュー」。P2 の 2D 平面、P3、P4 に出す）。文言は仮置き。
// 代表の決定（G55）: 「図面のとき左メニューは必須。オブジェクトが何で、どんな内容が入っているかを可視化する。」
// 仕様 1（共通部品）: P4 の左に、P3 と同じ左メニュー（見出し「オブジェクト」、説明文「種類ごとの件数（P3 の自動作成の結果）」）を出す。
//   左の列の幅は帯の幅（OBJECT_MENU_WIDTH = 180）で、その右に今までの本体と右パネル（360）が並ぶ。
// 仕様 2（P3 の自動作成の前）: store の plan が無いとき、件数は全部 0 で、「自動作成の後に出ます」と注記する。
// 仕様 3（P3 の自動作成の後）: plan があるとき、P3 の自動作成の結果から、P3 と同じ件数を出す（objectSourcesOfPlan）。注記は出さない。
// 仕様 4（本体はそのまま）: 左メニューを足しても、P4 の本体（見出し「P4 積算」、右パネルの「工事原価（概算）」）は今までどおり出る。
// 描画は実物（react-dom/server の静的描画）。モックするのは、store の読み出しだけ（zustand はサーバー側の描画で初期値を返すため）。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateAutoPlan } from '../plan/autoPlan'

// store の中身（試験ごとに差し替える）
const site = vi.hoisted(() => ({ state: { volume: null as unknown, plan: null as unknown } }))
vi.mock('../store/site', () => ({
  useSite: (selector: (s: typeof site.state) => unknown) => selector(site.state),
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
const CAPTION = '種類ごとの件数（P3 の自動作成の結果）'
// 一覧の行の文字（名前 + 件数 + 注記）を、並びどおりにつないだもの
const ROWS_NO_PLAN =
  '筆界0外形0通り芯0柱0（意味づけ未配線）コア0縦シャフト0廊下0住戸0壁0（意味づけ未配線）開口0（意味づけ未配線）部屋0'
// 中廊下（4 スパン・8 区画）: 筆界 0・外形 1・通り芯 5・コア 3・縦シャフト 10・廊下 1・住戸 8・部屋 32（P3 と同じ件数）
const ROWS_WITH_PLAN =
  '筆界0外形1通り芯5柱0（意味づけ未配線）コア3縦シャフト10廊下1住戸8壁0（意味づけ未配線）開口0（意味づけ未配線）部屋32'

const htmlOf = (): string => renderToStaticMarkup(createElement(P4Estimate))
// タグを除いた文字（隣り合う文字はつながる）
const textOf = (html: string): string => html.replace(/<[^>]*>/g, '')

beforeEach(() => {
  site.state = { volume: null, plan: null }
})

describe('P4 の左メニュー（共通部品。仕様 1）', () => {
  it('左に、見出し「オブジェクト」と説明文「種類ごとの件数（P3 の自動作成の結果）」が出る', () => {
    const text = textOf(htmlOf())
    expect(text).toContain(`オブジェクト${CAPTION}`)
  })

  it('左の列の幅は帯の幅（180）で、その右に本体と右パネル（360）が並ぶ', () => {
    expect(htmlOf()).toContain('grid-template-columns:180px 1fr 360px')
  })

  it('左メニューは本体より前（左）に出る', () => {
    const text = textOf(htmlOf())
    // 「オブジェクト」だけでは、本体の既存の文言（「対応するオブジェクトを作ってから」）にも当たるので、見出しと説明文で探す
    const menu = text.indexOf(`オブジェクト${CAPTION}`)
    expect(menu).toBeGreaterThanOrEqual(0)
    expect(menu).toBeLessThan(text.indexOf('P4 積算'))
  })

  it('種類を選んでいないので、中身の欄は出ない', () => {
    expect(htmlOf()).not.toContain('の中身')
  })
})

describe('P4 の左メニュー（P3 の自動作成の前。仕様 2）', () => {
  it('plan が無いとき、件数は全部 0（11 種類）', () => {
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

describe('P4 の本体（仕様 4）', () => {
  it('左メニューを足しても、P4 の見出しと右パネルは今までどおり出る（plan の有無によらない）', () => {
    for (const plan of [null, PLAN]) {
      site.state = { volume: null, plan }
      const text = textOf(htmlOf())
      expect(text, `plan=${plan === null ? 'なし' : 'あり'}`).toContain('P4 積算 — 単価と数量')
      expect(text, `plan=${plan === null ? 'なし' : 'あり'}`).toContain('工事原価（概算）')
    }
  })
})
