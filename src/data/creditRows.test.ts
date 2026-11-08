// 仕様（統括の依頼 2026-11-06。8: 画面の「出典:」の行を、☰ メニューの「クレジット（出典）」にまとめる）:
// 仕様 8-1: クレジットは、外部データの出典を全部（SOURCES と同じ件数）一行ずつ出す。
// 仕様 8-2: 各行は、出典の名前と、sourceLabel と同じ文（出典・URL・利用条件）を持つ。
// 仕様 8-3: 画面にあった出典（住所検索・PLATEAU・地理院タイル）を含む。
import { describe, expect, it } from 'vitest'
import { SOURCES, creditRowsOf, sourceLabel } from './sources'

describe('クレジット（出典）の行（仕様 8-1〜8-3）', () => {
  it('仕様 8-1: 出典と同じ件数の行を出す', () => {
    expect(creditRowsOf()).toHaveLength(Object.keys(SOURCES).length)
  })

  it('仕様 8-2: 各行は、出典の名前と sourceLabel と同じ文を持つ', () => {
    for (const row of creditRowsOf()) {
      expect(row.name).toBe(SOURCES[row.key].name)
      expect(row.text).toBe(sourceLabel(row.key))
    }
  })

  it('仕様 8-3: 画面にあった出典（住所検索・PLATEAU・地理院タイル）を含む', () => {
    const keys = creditRowsOf().map((r) => r.key)
    expect(keys).toEqual(expect.arrayContaining(['gsiAddress', 'plateau', 'basemap']))
  })
})
