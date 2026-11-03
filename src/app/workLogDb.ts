// 作業履歴の SQLite（モックの「作業ログ SQLite から SQL で取り出す一覧」）。sql.js の表に入れる。
// 保存は、表をバイト列に書き出して利用者のブラウザに置く（画面の中の作業の控えで、外へは出さない）。
// 行には、その時点の状態（スナップショットの文字列）を任意で付けられる（G68 の復元。仮置き）。状態は上限の数だけ残す。
import type { Database, SqlJsStatic } from 'sql.js'

/** 状態を残す行の上限（新しい順）。古い行は行だけ残して状態を外す（仮置き） */
export const SNAPSHOT_KEEP = 100

export interface WorkLogRow {
  id: number
  at: string
  screen: string
  action: string
  target: string
  /** この行に状態が付いているか（状態の本体は snapshotOfRow で取る） */
  hasSnapshot: boolean
}

export function createWorkLogTable(db: Database): void {
  db.run(`CREATE TABLE IF NOT EXISTS work_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at TEXT NOT NULL,
    screen TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    snapshot TEXT
  )`)
  // 状態の列が無い古い表（この変更の前に作られた表）には、列を足す
  const columns = db.exec('PRAGMA table_info(work_log)')[0]?.values ?? []
  if (!columns.some((c) => String(c[1]) === 'snapshot')) db.run('ALTER TABLE work_log ADD COLUMN snapshot TEXT')
}

export function insertLogRow(db: Database, entry: { at: string; screen: string; action: string; target: string; snapshot?: string | null }): void {
  db.run('INSERT INTO work_log (at, screen, action, target, snapshot) VALUES (?, ?, ?, ?, ?)', [
    entry.at,
    entry.screen,
    entry.action,
    entry.target,
    entry.snapshot ?? null,
  ])
}

export function readRecentLog(db: Database, opts: { limit: number; screen?: string }): WorkLogRow[] {
  const params: (string | number)[] = []
  let where = ''
  if (opts.screen !== undefined) {
    where = 'WHERE screen = ?'
    params.push(opts.screen)
  }
  params.push(opts.limit)
  const result = db.exec(
    `SELECT id, at, screen, action, target, (snapshot IS NOT NULL) AS has_snapshot FROM work_log ${where} ORDER BY id DESC LIMIT ?`,
    params,
  )
  const rows = result[0]?.values ?? []
  return rows.map((v) => ({
    id: Number(v[0]),
    at: String(v[1]),
    screen: String(v[2]),
    action: String(v[3]),
    target: String(v[4]),
    hasSnapshot: Number(v[5]) === 1,
  }))
}

/** 行の状態（スナップショットの文字列）。状態が無い行・存在しない行は null */
export function snapshotOfRow(db: Database, id: number): string | null {
  const values = db.exec('SELECT snapshot FROM work_log WHERE id = ?', [id])[0]?.values ?? []
  const v = values[0]?.[0]
  return typeof v === 'string' ? v : null
}

/** 状態を持つ行のうち、新しい順に keep 件だけ残し、それより古い行の状態を外す（行は残す） */
export function keepLatestSnapshots(db: Database, keep: number): void {
  db.run(
    `UPDATE work_log SET snapshot = NULL
     WHERE snapshot IS NOT NULL
       AND id NOT IN (SELECT id FROM work_log WHERE snapshot IS NOT NULL ORDER BY id DESC LIMIT ?)`,
    [keep],
  )
}

export function exportWorkLog(db: Database): Uint8Array {
  return db.export()
}

export function restoreWorkLog(SQL: SqlJsStatic, bytes: Uint8Array): Database {
  return new SQL.Database(bytes)
}
