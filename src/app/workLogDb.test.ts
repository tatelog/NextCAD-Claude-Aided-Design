// 仕様: 作業履歴の SQLite（モックの「作業ログ SQLite から SQL で取り出す一覧」）。
// 仕様 1: 作業ログの表（work_log）を作る。列は 時刻・画面・操作・対象。
// 仕様 2: 項目を入れると、新しい順（id の降順）に取り出せる。上限の件数だけ返す。
// 仕様 3: 画面で絞り込める（SQL の WHERE）。
// 仕様 4: 表の中身はバイト列に書き出せ、そのバイト列から同じ内容に戻せる（保存と復元）。
// 仕様 5: 項目が無ければ空の配列。
import { describe, expect, it } from 'vitest'
import initSqlJs from 'sql.js'
import { createWorkLogTable, insertLogRow, readRecentLog, exportWorkLog, restoreWorkLog, snapshotOfRow, keepLatestSnapshots } from './workLogDb'

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

// 仕様（G68 の復元。仮置き）: 行に、その時点の状態（スナップショットの文字列）を付けられる。
// 仕様 6: 状態を付けた行は、その文字列を同じ内容で取り出せる。付けなかった行は null。
// 仕様 7: 状態を持つ行は、新しい順に上限の数だけ残し、古い行は状態を外す（行そのものは残す）。
// 仕様 8: 行の状態は、取り出した行の hasSnapshot で分かる（状態の本体は、取り出すまで読まない）。
describe('作業履歴の行の状態（復元用）', () => {
  it('状態を付けた行は同じ文字列で取り出せ、付けない行は null', async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    createWorkLogTable(db)
    insertLogRow(db, { ...row(1), snapshot: '{"entries":[1]}' })
    insertLogRow(db, row(2))
    const rows = readRecentLog(db, { limit: 10 })
    expect(rows.map((r) => r.hasSnapshot)).toEqual([false, true])
    expect(snapshotOfRow(db, rows[1]!.id)).toBe('{"entries":[1]}')
    expect(snapshotOfRow(db, rows[0]!.id)).toBeNull()
  })

  it('存在しない行の状態は null', async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    createWorkLogTable(db)
    expect(snapshotOfRow(db, 999)).toBeNull()
  })

  it('状態を持つ行は、新しい順に上限の数だけ残し、古い行は状態を外す（行は残る）', async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    createWorkLogTable(db)
    for (let i = 1; i <= 5; i++) insertLogRow(db, { ...row(i), snapshot: `s${i}` })
    keepLatestSnapshots(db, 2)
    const rows = readRecentLog(db, { limit: 10 })
    expect(rows.map((r) => r.target)).toEqual(['t5', 't4', 't3', 't2', 't1'])
    expect(rows.map((r) => r.hasSnapshot)).toEqual([true, true, false, false, false])
  })

  it('古い版の表（状態の列が無い）を開いても、状態の列を足して使える', async () => {
    const SQL = await initSqlJs()
    const old = new SQL.Database()
    old.run(`CREATE TABLE work_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, screen TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL)`)
    old.run('INSERT INTO work_log (at, screen, action, target) VALUES (?, ?, ?, ?)', [row(1).at, 'P2', '切替', 't1'])
    createWorkLogTable(old)
    insertLogRow(old, { ...row(2), snapshot: 'x' })
    expect(readRecentLog(old, { limit: 10 }).map((r) => r.hasSnapshot)).toEqual([true, false])
  })
})
