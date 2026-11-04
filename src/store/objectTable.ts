// オブジェクト表のストア（ハブ A-03 G48・G58）。表（SQLite の object）が正本で、画面はそこから読む。決定論の部分は db/objectTableDb と plan/objectTable。
// 準備（init）の前は保存せず、入れた行をそのまま持つ（persisted は false）。準備の後は表に書き、表から読み出した行を持つ（persisted は true）。
import { create } from 'zustand'
import initSqlJs, { type Database } from 'sql.js'
import { createObjectTable, readObjectRows, replaceObjectRows } from '../db/objectTableDb'
import type { ObjectRow } from '../plan/objectTable'

export interface ObjectTableState {
  /** 表を開いた SQLite（準備の前は null） */
  db: Database | null
  /** 画面が読む行（表の中身。準備の前は入れた行そのまま） */
  rows: ObjectRow[]
  /** 表に保存しているか */
  persisted: boolean
  /** 表を開いて準備する（何度呼んでも一度だけ開く） */
  init: () => Promise<void>
  /** 行を入れる。表があれば書いて、表から読み出した行を持つ */
  setRows: (rows: readonly ObjectRow[]) => void
}

let opening: Promise<Database> | null = null

export const useObjectTable = create<ObjectTableState>((set, get) => ({
  db: null,
  rows: [],
  persisted: false,
  init: async () => {
    if (get().db) return
    if (!opening) {
      opening = initSqlJs().then((SQL) => {
        const db = new SQL.Database()
        db.exec('PRAGMA foreign_keys = ON')
        createObjectTable(db)
        return db
      })
    }
    const db = await opening
    set({ db, persisted: true })
  },
  setRows: (rows) => {
    const db = get().db
    if (!db) {
      set({ rows: [...rows], persisted: false })
      return
    }
    replaceObjectRows(db, rows)
    set({ rows: readObjectRows(db), persisted: true })
  },
}))
