// 作業履歴の SQLite（モックの「作業ログ SQLite から SQL で取り出す一覧」）。sql.js の表に入れる。
// 保存は、表をバイト列に書き出して利用者のブラウザに置く（画面の中の作業の控えで、外へは出さない）。
import type { Database, SqlJsStatic } from 'sql.js'

export interface WorkLogRow {
  id: number
  at: string
  screen: string
  action: string
  target: string
}

export function createWorkLogTable(db: Database): void {
  db.run(`CREATE TABLE IF NOT EXISTS work_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at TEXT NOT NULL,
    screen TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL
  )`)
}

export function insertLogRow(db: Database, entry: { at: string; screen: string; action: string; target: string }): void {
  db.run('INSERT INTO work_log (at, screen, action, target) VALUES (?, ?, ?, ?)', [entry.at, entry.screen, entry.action, entry.target])
}

export function readRecentLog(db: Database, opts: { limit: number; screen?: string }): WorkLogRow[] {
  const params: (string | number)[] = []
  let where = ''
  if (opts.screen !== undefined) {
    where = 'WHERE screen = ?'
    params.push(opts.screen)
  }
  params.push(opts.limit)
  const result = db.exec(`SELECT id, at, screen, action, target FROM work_log ${where} ORDER BY id DESC LIMIT ?`, params)
  const rows = result[0]?.values ?? []
  return rows.map((v) => ({ id: Number(v[0]), at: String(v[1]), screen: String(v[2]), action: String(v[3]), target: String(v[4]) }))
}

export function exportWorkLog(db: Database): Uint8Array {
  return db.export()
}

export function restoreWorkLog(SQL: SqlJsStatic, bytes: Uint8Array): Database {
  return new SQL.Database(bytes)
}
