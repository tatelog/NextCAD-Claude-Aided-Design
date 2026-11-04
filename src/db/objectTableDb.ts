// 図面のオブジェクト表の保存（ハブ A-03 G48・G49・G58、D-03「オブジェクト」）。SQLite（sql.js）の 1 表に、kind と親（parent_id）で持つ。決定論。
// 表は入れ替え（replace）で書く。親は子より先に入る。親が表に無い子は入らない（外部キーと入れる順の検査）。
import type { Database } from 'sql.js'
import type { ObjectRow } from '../plan/objectTable'

const DDL = `CREATE TABLE object (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('group', 'wall', 'column', 'beam', 'opening', 'grid', 'room', 'other')),
  attr TEXT,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES object(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL
)`

export function createObjectTable(db: Database): void {
  db.run(DDL)
}

/** 表の中身を入れ替える。親を先に入れる。親が無い子があれば、途中で止めて元に戻す */
export function replaceObjectRows(db: Database, rows: readonly ObjectRow[]): void {
  db.run('BEGIN')
  try {
    db.run('DELETE FROM object')
    const inserted = new Set<string>()
    // seq は入力の順。親を先に入れても、読み出しは入力の順に戻る
    let pending = rows.map((r, seq) => ({ r, seq }))
    while (pending.length > 0) {
      const ready = pending.filter(({ r }) => r.parent_id === null || inserted.has(r.parent_id))
      if (ready.length === 0) throw new Error('親が表に無い行がある')
      for (const { r, seq } of ready) {
        db.run('INSERT INTO object (id, kind, attr, name, parent_id, seq) VALUES (?, ?, ?, ?, ?, ?)', [r.id, r.kind, r.attr, r.name, r.parent_id, seq])
        inserted.add(r.id)
      }
      pending = pending.filter((p) => !ready.includes(p))
    }
    db.run('COMMIT')
  } catch (e) {
    db.run('ROLLBACK')
    throw e
  }
}

/** 表の中身を、入れた順（入力の順）に読み出す */
export function readObjectRows(db: Database): ObjectRow[] {
  const res = db.exec('SELECT id, kind, attr, name, parent_id FROM object ORDER BY seq')
  const values = res[0]?.values ?? []
  return values.map(([id, kind, attr, name, parent_id]) => ({
    id: id as string,
    kind: kind as ObjectRow['kind'],
    attr: attr as string | null,
    name: name as string,
    parent_id: parent_id as string | null,
  }))
}
