// 仕様: 単価テーブル T-10（D-03 T-10 単価、マスタ。A-03 G20・G48・G49・G63・G72）。
// ユーザーの指示（2026-11-03）: 単価はデータベース定義書の中のマスタとして、カラム定義つきのリレーショナルな表で持つ。
// 仕様 1: 表 unit_price を作る（D-03 T-10 の列）。部屋種別は配列なので中間表 unit_price_room_type に分ける（リレーショナル）。
// 仕様 2: kind は「造作」「労務」だけ。直接仮設・共通仮設費・現場管理費・一般管理費は表に入らない（G19）。
// 仕様 3: category は「躯体」「外装」「内装」「外構」だけ（G63）。
// 仕様 4: 労務の行には歩掛（factor、正の数）が必要。造作には要らない。
// 仕様 5: unit_price は 0 以上の整数の円（G21）。小数は入らない。
// 仕様 6: source_ref は NULL にできない（空文字は可。空は未確定の印で扱う、G22）。provisional は 0 か 1。
// 仕様 7: id は主キー（重複は入らない）。version は必須（見積の basis_version が参照する、T-04）。
// 仕様 8: 中間表は外部キーで unit_price を参照する（存在しない単価への紐付けは入らない）。単価を消すと紐付けも消える。
// 仕様 9: 行を入れて読み出すと、同じ値が戻る（部屋種別は並べ替えて比べる）。
import { describe, expect, it } from 'vitest'
import initSqlJs, { type Database } from 'sql.js'
import { createUnitPriceTables, insertUnitPrice, readUnitPrice, type NewUnitPrice } from './unitPrice'

async function openDb(): Promise<Database> {
  const SQL = await initSqlJs()
  const db = new SQL.Database()
  db.exec('PRAGMA foreign_keys = ON')
  createUnitPriceTables(db)
  return db
}

const cross: NewUnitPrice = {
  id: 'cross',
  kind: '造作',
  category: '内装',
  subcategory: 'クロス',
  item: 'クロス',
  spec: '量産品',
  quantity_rule: '壁の長さ × 天井高',
  unit: 'm2',
  unit_price: 1_200,
  region: null,
  source_ref: '出典A',
  provisional: false,
  effective_from: '2026-04-01',
  version: 'v1',
  room_types: ['居室', '廊下'],
}

const carpenter: NewUnitPrice = {
  id: 'carpenter',
  kind: '労務',
  category: '躯体',
  subcategory: null,
  item: '型枠大工',
  spec: null,
  quantity_rule: '歩掛（人工/m2）',
  unit: '人',
  unit_price: 25_000,
  factor: 0.3,
  region: '東京都',
  source_ref: '出典B',
  provisional: false,
  effective_from: '2026-04-01',
  version: 'v1',
  room_types: [],
}

describe('単価テーブル（T-10）', () => {
  it('表 unit_price と中間表 unit_price_room_type ができる', async () => {
    const db = await openDb()
    const names = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")[0]!.values.map((r) => r[0])
    expect(names).toEqual(expect.arrayContaining(['unit_price', 'unit_price_room_type']))
  })

  it('行を入れて読み出すと同じ値が戻る（部屋種別は並べ替えて比べる）', async () => {
    const db = await openDb()
    insertUnitPrice(db, cross)
    insertUnitPrice(db, carpenter)
    const back = readUnitPrice(db, 'cross')!
    expect({ ...back, room_types: [...back.room_types].sort() }).toEqual({ ...cross, room_types: [...cross.room_types].sort() })
    expect(readUnitPrice(db, 'carpenter')!.factor).toBe(0.3)
  })

  it('kind が列挙外（直接仮設など）なら入らない', async () => {
    const db = await openDb()
    expect(() => insertUnitPrice(db, { ...cross, id: 'x', kind: '直接仮設' as never })).toThrow()
  })

  it('category が列挙外なら入らない', async () => {
    const db = await openDb()
    expect(() => insertUnitPrice(db, { ...cross, id: 'x', category: '設備' as never })).toThrow()
  })

  it('労務の行に歩掛が無ければ入らない。造作は歩掛が無くてよい', async () => {
    const db = await openDb()
    expect(() => insertUnitPrice(db, { ...carpenter, id: 'x', factor: undefined })).toThrow()
    expect(() => insertUnitPrice(db, { ...cross, id: 'y', factor: undefined })).not.toThrow()
  })

  it('unit_price が負、または小数なら入らない', async () => {
    const db = await openDb()
    expect(() => insertUnitPrice(db, { ...cross, id: 'x', unit_price: -1 })).toThrow()
    expect(() => insertUnitPrice(db, { ...cross, id: 'y', unit_price: 1_200.5 })).toThrow()
  })

  it('source_ref は NULL にできない（空文字は可）', async () => {
    const db = await openDb()
    expect(() => insertUnitPrice(db, { ...cross, id: 'x', source_ref: null as never })).toThrow()
    expect(() => insertUnitPrice(db, { ...cross, id: 'y', source_ref: '' })).not.toThrow()
  })

  it('provisional は 0 か 1 だけ', async () => {
    const db = await openDb()
    expect(() => insertUnitPrice(db, { ...cross, id: 'x', provisional: 2 as never })).toThrow()
  })

  it('id は重複して入らない（主キー）', async () => {
    const db = await openDb()
    insertUnitPrice(db, cross)
    expect(() => insertUnitPrice(db, cross)).toThrow()
  })

  it('version は必須', async () => {
    const db = await openDb()
    expect(() => insertUnitPrice(db, { ...cross, id: 'x', version: null as never })).toThrow()
  })

  it('存在しない単価 ID への部屋種別の紐付けは入らない（外部キー）', async () => {
    const db = await openDb()
    expect(() => db.run('INSERT INTO unit_price_room_type (unit_price_id, room_type) VALUES (?, ?)', ['nope', '居室'])).toThrow()
  })

  it('単価を消すと部屋種別の紐付けも消える（カスケード）', async () => {
    const db = await openDb()
    insertUnitPrice(db, cross)
    db.run('DELETE FROM unit_price WHERE id = ?', ['cross'])
    const left = db.exec('SELECT COUNT(*) FROM unit_price_room_type')[0]!.values[0]![0]
    expect(left).toBe(0)
  })
})
