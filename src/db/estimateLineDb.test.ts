import { describe, expect, it } from 'vitest'
import initSqlJs from 'sql.js'
import { createEstimateTable, readEstimateLines, replaceEstimateLines } from './estimateLineDb'
import type { EstimateDetail } from '../estimate/estimateDetails'

// 仕様（ハブ A-03 G86。統括の決定「見積は明細の DB」、2026-11-04）から書いたテスト。
// - 見積の明細は、SQLite（sql.js）の表 estimate_line に入る。表は入れ替え（replace）で書く。
// - 列は明細の行と同じ（line_id・object_id・category・item・quantity・unit・unit_price_ref・amount_yen・provisional・source・basis）。
// - 区分は躯体・外装・内装・外構のどれか（それ以外は入らない）。provisional は 0/1 で持つ。
// - 読むときは入れた順（seq）に返す。

const LINES: EstimateDetail[] = [
  {
    lineId: 'slab-1/formwork',
    objectId: 'slab-1',
    category: '躯体',
    item: '型枠（床版の下面）',
    quantity: 90,
    unit: 'm2',
    unitPriceRef: 'carpenter',
    amountYen: 675000,
    provisional: true,
    source: '出典なし・仮置き（G22）',
    basis: '床版と同じ面積（支保工は含めない）',
  },
  {
    lineId: 'roof-1/roof',
    objectId: 'roof-1',
    category: '外装',
    item: '屋根防水',
    quantity: 18,
    unit: 'm2',
    unitPriceRef: null,
    amountYen: null,
    provisional: false,
    source: '計算（仮置きなし）',
    basis: '外形から',
  },
]

async function openDb() {
  const SQL = await initSqlJs()
  const db = new SQL.Database()
  createEstimateTable(db)
  return db
}

describe('見積の明細の表（estimate_line）', () => {
  it('入れた明細を、同じ内容で、入れた順に読める（provisional は真偽、金額は無いものは null）', async () => {
    const db = await openDb()
    replaceEstimateLines(db, LINES)
    expect(readEstimateLines(db)).toEqual(LINES)
  })

  it('書き直すと、前の明細は残らない（入れ替え）', async () => {
    const db = await openDb()
    replaceEstimateLines(db, LINES)
    replaceEstimateLines(db, [LINES[1]!])
    expect(readEstimateLines(db)).toEqual([LINES[1]])
  })

  it('区分が 躯体・外装・内装・外構 以外の行は入らない（エラー）', async () => {
    const db = await openDb()
    const bad = { ...LINES[0]!, category: 'その他' as unknown as EstimateDetail['category'] }
    expect(() => replaceEstimateLines(db, [bad])).toThrow()
  })

  it('明細が空なら、表は空になる', async () => {
    const db = await openDb()
    replaceEstimateLines(db, LINES)
    replaceEstimateLines(db, [])
    expect(readEstimateLines(db)).toEqual([])
  })
})
