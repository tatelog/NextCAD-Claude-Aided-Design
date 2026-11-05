// 仕様（ハブ A-03 G68「作業履歴」・「CSV 書き出し」）: 作業履歴の行を CSV にする。1 行 = 時刻・画面・操作・対象・前→後・誰。
// 仕様 1: 先頭行は見出し（時刻,画面,操作,対象,前→後,誰）。行は、渡された順に並ぶ。
// 仕様 2: カンマ・改行・二重引用符を含む値は、二重引用符で囲み、中の二重引用符は二つにする（CSV の規則）。
// 仕様 3: 空の一覧なら、見出しだけ。Excel で文字化けしないよう、先頭に BOM を付ける。
// 仕様 4: 入力を書き換えず、同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { workLogToCsv } from './workLogCsv'

const ROW = { at: '2026-11-04T01:02:03.000Z', screen: 'P3', action: '線の変更', target: '線 3 本', change: '2 本 → 3 本', who: '代表' }
const BOM = '﻿'

describe('作業履歴の CSV（仕様 1〜4）', () => {
  it('仕様 1: 見出しを先頭に、行は渡された順に並ぶ', () => {
    const csv = workLogToCsv([ROW, { ...ROW, screen: 'P2' }])
    expect(csv).toBe(`${BOM}時刻,画面,操作,対象,前→後,誰\n2026-11-04T01:02:03.000Z,P3,線の変更,線 3 本,2 本 → 3 本,代表\n2026-11-04T01:02:03.000Z,P2,線の変更,線 3 本,2 本 → 3 本,代表\n`)
  })

  it('仕様 2: カンマ・改行・二重引用符を含む値は、囲んで二重引用符を二つにする', () => {
    const csv = workLogToCsv([{ ...ROW, target: '住戸 A, "B"\n次の行' }])
    expect(csv).toContain('"住戸 A, ""B""\n次の行"')
  })

  it('仕様 3: 空なら見出しだけ（BOM 付き）', () => {
    expect(workLogToCsv([])).toBe(`${BOM}時刻,画面,操作,対象,前→後,誰\n`)
  })

  it('仕様 4: 同じ入力には同じ出力で、入力を書き換えない', () => {
    const rows = [{ ...ROW }]
    expect(workLogToCsv(rows)).toBe(workLogToCsv(rows))
    expect(rows[0]).toEqual(ROW)
  })
})
