// 仕様（ハブ A-03 G48・G49・G58、D-03「オブジェクト」表）: 図面のオブジェクト表を、SQLite（sql.js）の 1 表に保存する。
// 仕様 1: 表 object を作る。id は主キー、kind は group・wall・column・beam・opening・grid・room・other のどれか、name は必須、attr は任意、parent_id は object.id を参照する。
// 仕様 2: 行を入れて読み出すと、同じ値が入れた順に戻る。
// 仕様 3: 親が表に無い子は入らない（外部キーで拒否）。親は子より先に入る（入れる順は問わない）。
// 仕様 4: replace は、表の中身を入れ替える。前の行は残らない。
// 仕様 5: kind に表に無い値は入らない（CHECK）。
// 仕様 6: 同じ入力には同じ出力（二回 replace しても同じ結果）。
import { describe, expect, it } from 'vitest'
import initSqlJs, { type Database } from 'sql.js'
import { createObjectTable, readObjectRows, replaceObjectRows } from './objectTableDb'
import type { ObjectRow } from '../plan/objectTable'

async function openDb(): Promise<Database> {
  const SQL = await initSqlJs()
  const db = new SQL.Database()
  db.exec('PRAGMA foreign_keys = ON')
  createObjectTable(db)
  return db
}

const rows: ObjectRow[] = [
  { id: 'u1', kind: 'group', attr: '住戸', name: 'u1', parent_id: null },
  { id: 'u1-0', kind: 'room', attr: null, name: 'LDK', parent_id: 'u1' },
  { id: 'PS-u1', kind: 'other', attr: 'PS', name: 'PS', parent_id: 'u1' },
  { id: 'common', kind: 'group', attr: '共用部', name: '共用部', parent_id: null },
  { id: 'corridor', kind: 'other', attr: '廊下', name: '廊下', parent_id: 'common' },
]

describe('表の作成と読み出し（仕様 1〜2）', () => {
  it('入れた行が、入れた順に同じ値で戻る', async () => {
    const db = await openDb()
    replaceObjectRows(db, rows)
    expect(readObjectRows(db)).toEqual(rows)
  })
})

describe('親子の整合（仕様 3）', () => {
  it('親が表に無い子は入らない', async () => {
    const db = await openDb()
    expect(() => replaceObjectRows(db, [{ id: 'x', kind: 'room', attr: null, name: 'LDK', parent_id: 'nope' }])).toThrow()
  })

  it('親が後ろにあっても、親を先に入れて入る', async () => {
    const db = await openDb()
    const reversed = [...rows].reverse()
    replaceObjectRows(db, reversed)
    expect(readObjectRows(db).map((r) => r.id).sort()).toEqual(rows.map((r) => r.id).sort())
  })
})

describe('入れ替え（仕様 4）', () => {
  it('replace は前の行を残さない', async () => {
    const db = await openDb()
    replaceObjectRows(db, rows)
    replaceObjectRows(db, [{ id: 'u9', kind: 'group', attr: '住戸', name: 'u9', parent_id: null }])
    expect(readObjectRows(db)).toEqual([{ id: 'u9', kind: 'group', attr: '住戸', name: 'u9', parent_id: null }])
  })
})

describe('kind の制約（仕様 5）', () => {
  it('表に無い kind は入らない', async () => {
    const db = await openDb()
    expect(() => replaceObjectRows(db, [{ id: 'z', kind: 'foo' as never, attr: null, name: 'z', parent_id: null }])).toThrow()
  })
})

describe('同じ入力（仕様 6）', () => {
  it('二回 replace しても、読み出しは同じ', async () => {
    const db = await openDb()
    replaceObjectRows(db, rows)
    const first = readObjectRows(db)
    replaceObjectRows(db, rows)
    expect(readObjectRows(db)).toEqual(first)
  })
})
