// 仕様（ハブ A-03 G58・D-04 共通部品「左メニュー」）: 左の一覧は、住戸をグループとして出す。住戸の中身（部屋・PS・置いた什器）を数える。
// 仕様 1: 住戸の数は、親なしの住戸グループ（属性が住戸）の数。
// 仕様 2: 中身の数は、住戸を親に持つ行の数を、種類ごとに足す（部屋・PS・置いた什器）。
// 仕様 3: 住戸の外の行（共用部・親なし）は、どの中身にも数えない。
// 仕様 4: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { unitGroupSummary } from './unitGroupSummary'
import type { ObjectRow } from './objectTable'

const rows: ObjectRow[] = [
  { id: 'u1', kind: 'group', attr: '住戸', name: 'u1', parent_id: null },
  { id: 'u2', kind: 'group', attr: '住戸', name: 'u2', parent_id: null },
  { id: 'common', kind: 'group', attr: '共用部', name: '共用部', parent_id: null },
  { id: 'u1-0', kind: 'room', attr: null, name: 'LDK', parent_id: 'u1' },
  { id: 'u1-1', kind: 'room', attr: null, name: '洋室', parent_id: 'u1' },
  { id: 'u2-0', kind: 'room', attr: null, name: 'LDK', parent_id: 'u2' },
  { id: 'PS-u1', kind: 'other', attr: 'PS', name: 'PS', parent_id: 'u1' },
  { id: 'PS-u2', kind: 'other', attr: 'PS', name: 'PS', parent_id: 'u2' },
  { id: 'f1', kind: 'other', attr: '什器', name: 'キッチン', parent_id: 'u1' },
  { id: 'EPS', kind: 'other', attr: 'EPS', name: 'EPS', parent_id: 'common' },
  { id: 'corridor', kind: 'other', attr: '廊下', name: '廊下', parent_id: 'common' },
  { id: 'f2', kind: 'other', attr: '什器', name: '洗面', parent_id: null },
]

describe('住戸のグループの数（仕様 1〜3）', () => {
  it('住戸は 2 戸。中身は部屋 3・PS 2・置いた什器 1（住戸の外の行は数えない）', () => {
    expect(unitGroupSummary(rows)).toEqual({ units: 2, rooms: 3, shafts: 2, fixtures: 1 })
  })
})

describe('同じ入力（仕様 4）', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const before = JSON.stringify(rows)
    expect(unitGroupSummary(rows)).toEqual(unitGroupSummary(rows))
    expect(JSON.stringify(rows)).toBe(before)
  })
})
