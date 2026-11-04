// 見積の明細のストア（ハブ A-03 G86「見積は明細の DB」）。表（SQLite の estimate_line）が正本で、画面はそこから読む。決定論の部分は db/estimateLineDb と estimate/estimateDetails。
// 準備（init）の前は保存せず、入れた明細をそのまま持つ（persisted は false）。準備の後は表に書き、表から読み出した明細を持つ（persisted は true）。
import { create } from 'zustand'
import initSqlJs, { type Database } from 'sql.js'
import { createEstimateTable, readEstimateLines, replaceEstimateLines } from '../db/estimateLineDb'
import type { EstimateDetail } from '../estimate/estimateDetails'

export interface EstimateLinesState {
  /** 表を開いた SQLite（準備の前は null） */
  db: Database | null
  /** 画面が読む明細（表の中身。準備の前は入れた明細そのまま） */
  lines: EstimateDetail[]
  /** 表に保存しているか */
  persisted: boolean
  /** 表を開いて準備する（何度呼んでも一度だけ開く） */
  init: () => Promise<void>
  /** 明細を入れる。表があれば書いて、表から読み出した明細を持つ */
  setLines: (lines: readonly EstimateDetail[]) => void
}

let opening: Promise<Database> | null = null

export const useEstimateLines = create<EstimateLinesState>((set, get) => ({
  db: null,
  lines: [],
  persisted: false,
  init: async () => {
    if (get().db) return
    if (!opening) {
      opening = initSqlJs().then((SQL) => {
        const db = new SQL.Database()
        createEstimateTable(db)
        return db
      })
    }
    const db = await opening
    set({ db, persisted: true })
  },
  setLines: (lines) => {
    const db = get().db
    if (!db) {
      set({ lines: [...lines], persisted: false })
      return
    }
    replaceEstimateLines(db, lines)
    set({ lines: readEstimateLines(db), persisted: true })
  },
}))
