// 作業履歴の保存先（sql.js の表）。画面を開いたときに、前回の表を localStorage から戻す（同じブラウザの中だけ。外へは出さない）。
// localStorage は保存できないときに例外を出すため、読み書きは try で囲み、表は画面の中でも使える。
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { createWorkLogTable, exportWorkLog, insertLogRow, readRecentLog, restoreWorkLog, type WorkLogRow } from './workLogDb'

const KEY = 'work-log-sqlite-v1'
let SQL: SqlJsStatic | null = null
let db: Database | null = null

function bytesToBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

function base64ToBytes(text: string): Uint8Array {
  const s = atob(text)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

export async function openWorkLog(): Promise<void> {
  if (db !== null) return
  SQL = await initSqlJs({ locateFile: () => wasmUrl })
  let saved: string | null = null
  try {
    saved = localStorage.getItem(KEY)
  } catch {
    saved = null
  }
  db = saved ? restoreWorkLog(SQL, base64ToBytes(saved)) : new SQL.Database()
  createWorkLogTable(db)
}

export function recordWorkLog(entry: { at: string; screen: string; action: string; target: string }): void {
  if (db === null) return
  insertLogRow(db, entry)
  try {
    localStorage.setItem(KEY, bytesToBase64(exportWorkLog(db)))
  } catch {
    // 保存できない環境では、画面の中の表だけで続ける
  }
}

export function recentWorkLog(limit: number): WorkLogRow[] {
  return db === null ? [] : readRecentLog(db, { limit })
}
