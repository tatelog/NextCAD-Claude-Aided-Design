// 見積の明細の保存（ハブ A-03 G86「見積は明細の DB」）。SQLite（sql.js）の 1 表 estimate_line に、明細の行を入れる。決定論。
// 表は入れ替え（replace）で書く。読み出しは入れた順（seq）。区分は CATEGORIES の 4 つだけ（それ以外は CHECK で弾く）。
import type { Database } from 'sql.js'
import { CATEGORIES } from '../estimate/estimate'
import type { EstimateDetail } from '../estimate/estimateDetails'

const DDL = `CREATE TABLE estimate_line (
  seq INTEGER NOT NULL,
  line_id TEXT PRIMARY KEY,
  object_id TEXT,
  origin TEXT NOT NULL CHECK (origin IN ('自動', '手入力')),
  category TEXT NOT NULL CHECK (category IN (${CATEGORIES.map((c) => `'${c}'`).join(', ')})),
  item TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  unit_price_ref TEXT,
  amount_yen INTEGER,
  provisional INTEGER NOT NULL CHECK (provisional IN (0, 1)),
  source TEXT NOT NULL,
  basis TEXT NOT NULL
)`

export function createEstimateTable(db: Database): void {
  db.run(DDL)
}

/** 表の中身を入れ替える。途中で失敗したら元に戻す */
export function replaceEstimateLines(db: Database, lines: readonly EstimateDetail[]): void {
  db.run('BEGIN')
  try {
    db.run('DELETE FROM estimate_line')
    lines.forEach((l, seq) => {
      db.run(
        'INSERT INTO estimate_line (seq, line_id, object_id, origin, category, item, quantity, unit, unit_price_ref, amount_yen, provisional, source, basis) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [seq, l.lineId, l.objectId, l.origin, l.category, l.item, l.quantity, l.unit, l.unitPriceRef, l.amountYen, l.provisional ? 1 : 0, l.source, l.basis],
      )
    })
    db.run('COMMIT')
  } catch (e) {
    db.run('ROLLBACK')
    throw e
  }
}

/** 表の中身を、入れた順（seq）に読み出す */
export function readEstimateLines(db: Database): EstimateDetail[] {
  const res = db.exec(
    'SELECT line_id, object_id, origin, category, item, quantity, unit, unit_price_ref, amount_yen, provisional, source, basis FROM estimate_line ORDER BY seq',
  )
  const values = res[0]?.values ?? []
  return values.map(([lineId, objectId, origin, category, item, quantity, unit, unitPriceRef, amountYen, provisional, source, basis]) => ({
    lineId: lineId as string,
    objectId: objectId as string | null,
    origin: origin as EstimateDetail['origin'],
    category: category as EstimateDetail['category'],
    item: item as string,
    quantity: quantity as number,
    unit: unit as EstimateDetail['unit'],
    unitPriceRef: unitPriceRef as string | null,
    amountYen: amountYen as number | null,
    provisional: provisional === 1,
    source: source as string,
    basis: basis as string,
  }))
}
