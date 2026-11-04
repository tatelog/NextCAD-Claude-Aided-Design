// 仕様（ハブ A-03 G48・G58。オブジェクト表は SQLite の 1 表が正本、画面はそこから読む）:
// 仕様 1: 表の準備（init）の前は、入れた行をそのまま持つ（保存はしない。persisted は false）。
// 仕様 2: 準備の後は、setRows で表に書き、表から読み出した行を持つ（persisted は true）。読み出しは入力の順。
// 仕様 3: setRows を重ねると、表の中身は最新の入力だけになる。
// 仕様 4: 同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { useObjectTable } from './objectTable'
import type { ObjectRow } from '../plan/objectTable'

const rows: ObjectRow[] = [
  { id: 'u1', kind: 'group', attr: '住戸', name: 'u1', parent_id: null },
  { id: 'u1-0', kind: 'room', attr: null, name: 'LDK', parent_id: 'u1' },
]

describe('準備の前（仕様 1）', () => {
  it('入れた行をそのまま持ち、保存はしない', () => {
    useObjectTable.setState({ db: null, rows: [], persisted: false })
    useObjectTable.getState().setRows(rows)
    expect(useObjectTable.getState().rows).toEqual(rows)
    expect(useObjectTable.getState().persisted).toBe(false)
  })
})

describe('準備の後（仕様 2〜3）', () => {
  it('表に書き、表から読み出した行を持つ（入力の順）', async () => {
    await useObjectTable.getState().init()
    useObjectTable.getState().setRows(rows)
    expect(useObjectTable.getState().rows).toEqual(rows)
    expect(useObjectTable.getState().persisted).toBe(true)
  })

  it('setRows を重ねると、最新の入力だけになる', async () => {
    await useObjectTable.getState().init()
    useObjectTable.getState().setRows(rows)
    const next: ObjectRow[] = [{ id: 'u9', kind: 'group', attr: '住戸', name: 'u9', parent_id: null }]
    useObjectTable.getState().setRows(next)
    expect(useObjectTable.getState().rows).toEqual(next)
  })
})

describe('同じ入力（仕様 4）', () => {
  it('同じ入力には同じ出力', async () => {
    await useObjectTable.getState().init()
    useObjectTable.getState().setRows(rows)
    const first = useObjectTable.getState().rows
    useObjectTable.getState().setRows(rows)
    expect(useObjectTable.getState().rows).toEqual(first)
  })
})
