// 仕様: 利用者が出典つきで置く単価表（CSV）を読む（D-02 C8、D-03 T-10、A-03 G20）。
// 置き場は G72 で代表の答え待ちのため、読み込みは「CSV の文字列 → PriceRow の配列」だけに閉じる（差し替えやすさ）。
// 仕様 1: ヘッダーは id,kind,category,item,unit,unit_price,factor,source_ref,provisional,version。欠けた列があれば弾く。
// 仕様 2: 各行を PriceRow に直す。unit_price は整数、factor は空欄（造作）または正の数、provisional は true/false。
// 仕様 3: 行が壊れていたら行番号を付けて弾く（どの行かが分かるように）。
// 仕様 4: BOM・CRLF・引用符つきの欄（カンマを含む品目名）を読める。
import { describe, expect, it } from 'vitest'
import { parsePriceCsv } from './priceCsv'

const header = 'id,kind,category,item,unit,unit_price,factor,source_ref,provisional,version'

describe('parsePriceCsv', () => {
  it('ヘッダーと各行を PriceRow に直す', () => {
    const rows = parsePriceCsv(
      [header, 'cross,造作,内装,クロス,m2,1200,,出典A,false,v1', 'carp,労務,躯体,型枠大工,人,25000,0.3,出典B,false,v1'].join('\n'),
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({
      id: 'cross',
      kind: '造作',
      category: '内装',
      item: 'クロス',
      unit: 'm2',
      unit_price: 1200,
      factor: undefined,
      source_ref: '出典A',
      provisional: false,
      version: 'v1',
    })
    expect(rows[1]!.factor).toBe(0.3)
  })

  it('ヘッダーの列が欠けていれば弾く', () => {
    expect(() => parsePriceCsv('id,kind,category\ncross,造作,内装')).toThrow(/unit_price/)
  })

  it('壊れた行は行番号を付けて弾く', () => {
    const text = [header, 'cross,造作,内装,クロス,m2,1200,,出典A,false,v1', 'bad,造作,内装,床,m2,1200.5,,出典,false,v1'].join('\n')
    expect(() => parsePriceCsv(text)).toThrow(/3行目/)
  })

  it('BOM・CRLF・引用符つきの欄（カンマを含む品目名）を読める', () => {
    const text = `﻿${header}\r\ncross,造作,内装,"クロス, 壁用",m2,1200,,出典A,false,v1\r\n`
    const rows = parsePriceCsv(text)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.item).toBe('クロス, 壁用')
  })
})
