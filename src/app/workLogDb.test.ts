// 仕様: 作業履歴の SQLite（モックの「作業ログ SQLite から SQL で取り出す一覧」）。
// 仕様 1: 作業ログの表（work_log）を作る。列は 時刻・画面・操作・対象。
// 仕様 2: 項目を入れると、新しい順（id の降順）に取り出せる。上限の件数だけ返す。
// 仕様 3: 画面で絞り込める（SQL の WHERE）。
// 仕様 4: 表の中身はバイト列に書き出せ、そのバイト列から同じ内容に戻せる（保存と復元）。
// 仕様 5: 項目が無ければ空の配列。
import { describe, expect, it } from 'vitest'
import initSqlJs from 'sql.js'
import { createWorkLogTable, insertLogRow, readRecentLog, exportWorkLog, restoreWorkLog } from './workLogDb'

const row = (n: number, screen = 'P2') => ({ at: `2026-11-03T00:00:${String(n).padStart(2, '0')}Z`, screen, action: '切替', target: `t${n}` })

describe('作業履歴の SQLite', () => {
  it('新しい順に、上限の件数だけ取り出す', async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    createWorkLogTable(db)
    for (let i = 1; i <= 5; i++) insertLogRow(db, row(i))
    expect(readRecentLog(db, { limit: 3 }).map((r) => r.target)).toEqual(['t5', 't4', 't3'])
  })

  it('画面で絞り込める', async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    createWorkLogTable(db)
    insertLogRow(db, row(1, 'P1'))
    insertLogRow(db, row(2, 'P2'))
    insertLogRow(db, row(3, 'P1'))
    expect(readRecentLog(db, { limit: 10, screen: 'P1' }).map((r) => r.target)).toEqual(['t3', 't1'])
  })

  it('書き出したバイト列から同じ内容に戻せる', async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    createWorkLogTable(db)
    insertLogRow(db, row(1))
    insertLogRow(db, row(2))
    const bytes = exportWorkLog(db)
    const back = restoreWorkLog(SQL, bytes)
    expect(readRecentLog(back, { limit: 10 }).map((r) => r.target)).toEqual(['t2', 't1'])
  })

  it('項目が無ければ空', async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    createWorkLogTable(db)
    expect(readRecentLog(db, { limit: 10 })).toEqual([])
  })
})
