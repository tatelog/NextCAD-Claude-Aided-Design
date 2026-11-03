// 単価テーブル T-10（D-03 T-10 単価、マスタ。A-03 G20・G48・G49・G63）。SQLite（sql.js で開く。D1 にも同じ DDL を流せる形）。
// 制約は表の定義（CHECK・NOT NULL・外部キー）で持つ。値（単価）は本書に書かない。利用者が出典つきで入れる（G20）。
import type { Database } from 'sql.js'

export const KINDS = ['造作', '労務'] as const
export const CATEGORIES = ['躯体', '外装', '内装', '外構'] as const
export const SUBCATEGORIES = ['クロス', '什器', 'ユニットバス', 'その他'] as const

export interface NewUnitPrice {
  id: string
  kind: (typeof KINDS)[number]
  category: (typeof CATEGORIES)[number]
  subcategory?: string | null
  item: string
  spec?: string | null
  quantity_rule?: string | null
  /** 歩掛（労務のみ必須。正の数） */
  factor?: number
  unit: string
  /** 円の整数 */
  unit_price: number
  region?: string | null
  /** 出典。空文字は可（空は未確定の印で扱う。G22）。NULL は不可 */
  source_ref: string
  provisional: boolean | number
  /** 適用開始日（ISO の日付文字列） */
  effective_from: string
  /** 単価表の版（見積の basis_version が参照する。T-04） */
  version: string
  /** 対象の部屋種別（中間表に分けて持つ） */
  room_types: string[]
}

const DDL = [
  `CREATE TABLE unit_price (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('造作', '労務')),
    category TEXT NOT NULL CHECK (category IN ('躯体', '外装', '内装', '外構')),
    subcategory TEXT CHECK (subcategory IS NULL OR subcategory IN ('クロス', '什器', 'ユニットバス', 'その他')),
    item TEXT NOT NULL,
    spec TEXT,
    quantity_rule TEXT,
    factor REAL CHECK (factor IS NULL OR factor > 0),
    unit TEXT NOT NULL,
    unit_price INTEGER NOT NULL CHECK (unit_price >= 0 AND unit_price = CAST(unit_price AS INTEGER)),
    region TEXT,
    source_ref TEXT NOT NULL,
    provisional INTEGER NOT NULL CHECK (provisional IN (0, 1)),
    effective_from TEXT NOT NULL,
    version TEXT NOT NULL,
    CHECK (kind <> '労務' OR factor IS NOT NULL)
  )`,
  `CREATE TABLE unit_price_room_type (
    unit_price_id TEXT NOT NULL REFERENCES unit_price(id) ON DELETE CASCADE,
    room_type TEXT NOT NULL,
    PRIMARY KEY (unit_price_id, room_type)
  )`,
]

export function createUnitPriceTables(db: Database): void {
  for (const sql of DDL) db.run(sql)
}

export function insertUnitPrice(db: Database, row: NewUnitPrice): void {
  const nul = <T>(v: T | undefined): T | null => (v === undefined ? null : v)
  db.run('BEGIN')
  try {
    db.run(
      `INSERT INTO unit_price
        (id, kind, category, subcategory, item, spec, quantity_rule, factor, unit, unit_price, region, source_ref, provisional, effective_from, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id,
        row.kind,
        row.category,
        nul(row.subcategory),
        row.item,
        nul(row.spec),
        nul(row.quantity_rule),
        nul(row.factor),
        row.unit,
        row.unit_price,
        nul(row.region),
        row.source_ref,
        Number(row.provisional),
        row.effective_from,
        row.version,
      ],
    )
    for (const room of row.room_types) {
      db.run('INSERT INTO unit_price_room_type (unit_price_id, room_type) VALUES (?, ?)', [row.id, room])
    }
    db.run('COMMIT')
  } catch (e) {
    db.run('ROLLBACK')
    throw e
  }
}

export function readUnitPrice(db: Database, id: string): NewUnitPrice | null {
  const res = db.exec(
    `SELECT id, kind, category, subcategory, item, spec, quantity_rule, factor, unit, unit_price, region, source_ref, provisional, effective_from, version
     FROM unit_price WHERE id = ?`,
    [id],
  )
  const r = res[0]?.values[0]
  if (!r) return null
  const [rid, kind, category, subcategory, item, spec, quantity_rule, factor, unit, unit_price, region, source_ref, provisional, effective_from, version] = r
  const rooms = db.exec('SELECT room_type FROM unit_price_room_type WHERE unit_price_id = ? ORDER BY room_type', [id])[0]?.values ?? []
  return {
    id: rid as string,
    kind: kind as NewUnitPrice['kind'],
    category: category as NewUnitPrice['category'],
    subcategory: subcategory as string | null,
    item: item as string,
    spec: spec as string | null,
    quantity_rule: quantity_rule as string | null,
    ...(factor === null ? {} : { factor: factor as number }),
    unit: unit as string,
    unit_price: unit_price as number,
    region: region as string | null,
    source_ref: source_ref as string,
    provisional: provisional === 1,
    effective_from: effective_from as string,
    version: version as string,
    room_types: rooms.map((x) => x[0] as string),
  }
}
