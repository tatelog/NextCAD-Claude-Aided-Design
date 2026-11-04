// 仕様（ハブ A-03 G48・G58・G75、D-03 の「オブジェクト」表）: 図面のオブジェクトは一つの表に、kind と親（parent_id）で持つ。
// 住戸と共用部はグループ（kind を持たない入れ物）。住戸の中身（部屋・PS・置いた什器）は住戸の子、共用部の中身（廊下・コア・EPS・DS）は共用部の子。
// 仕様 1: 住戸は、一行のグループ（親なし）。
// 仕様 2: 部屋は、その住戸を親に持つ（kind は部屋）。
// 仕様 3: PS は、その住戸を親に持つ（kind はその他・属性は PS）。
// 仕様 4: EPS と DS と、廊下・コア（階段・EV）は、共用部グループの子。
// 仕様 5: 住戸に置いた什器は、その住戸の子（kind はその他・属性は什器）。区画の無い什器は親なし。
// 仕様 6: 親の ID は、必ず表の中の行を指す（参照の整合）。
// 仕様 7: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { objectTableOf, type ObjectTableInput } from './objectTable'

const input: ObjectTableInput = {
  cells: [
    { id: 'u1', x0: 0, y0: 0, x1: 3000, y1: 6000 },
    { id: 'u2', x0: 3000, y0: 0, x1: 6000, y1: 6000 },
  ],
  rooms: [
    { id: 'u1-0', kind: 'LDK', x0: 0, y0: 0, x1: 3000, y1: 3000 },
    { id: 'u1-1', kind: '水回り', x0: 0, y0: 3000, x1: 3000, y1: 6000 },
  ],
  shafts: [
    { id: 'PS-u1', kind: 'PS', unitId: 'u1', x0: 100, y0: 200, x1: 700, y1: 800 },
    { id: 'EPS', kind: 'EPS', x0: 0, y0: 6100, x1: 600, y1: 6700 },
    { id: 'DS', kind: 'DS', x0: 5400, y0: 6100, x1: 6000, y1: 6700 },
  ],
  cores: [
    { id: 'stairA', x0: 0, y0: 6000, x1: 6000, y1: 6300 },
    { id: 'evHall', x0: 0, y0: 6300, x1: 6000, y1: 6600 },
  ],
  corridor: { id: 'corridor', x0: 0, y0: 0, x1: 6000, y1: 6000 },
  fixtures: [
    { id: 'f1', item: 'kitchen', unitId: 'u1' },
    { id: 'f2', item: 'washbasin', unitId: null },
  ],
}

const row = (rows: ReturnType<typeof objectTableOf>, id: string) => rows.find((r) => r.id === id)

describe('住戸と部屋（仕様 1〜2）', () => {
  it('住戸は一行のグループで、親を持たない', () => {
    const r = row(objectTableOf(input), 'u1')
    expect(r).toMatchObject({ kind: 'group', parent_id: null })
  })

  it('部屋は、その住戸を親に持つ', () => {
    expect(row(objectTableOf(input), 'u1-0')).toMatchObject({ kind: 'room', parent_id: 'u1' })
  })
})

describe('PS と共用部（仕様 3〜4）', () => {
  it('PS は、その住戸の子（その他・属性 PS）', () => {
    expect(row(objectTableOf(input), 'PS-u1')).toMatchObject({ kind: 'other', attr: 'PS', parent_id: 'u1' })
  })

  it('EPS・DS・廊下・コアは、共用部グループの子', () => {
    const rows = objectTableOf(input)
    const common = row(rows, 'common')
    expect(common).toMatchObject({ kind: 'group', parent_id: null })
    for (const id of ['EPS', 'DS', 'corridor', 'stairA', 'evHall']) {
      expect(row(rows, id)?.parent_id).toBe('common')
    }
  })
})

describe('什器（仕様 5）', () => {
  it('住戸に置いた什器は、その住戸の子。区画の無い什器は親なし', () => {
    const rows = objectTableOf(input)
    expect(row(rows, 'f1')).toMatchObject({ kind: 'other', attr: '什器', parent_id: 'u1' })
    expect(row(rows, 'f2')).toMatchObject({ kind: 'other', attr: '什器', parent_id: null })
  })
})

describe('参照の整合（仕様 6）', () => {
  it('親の ID は、必ず表の中の行を指す', () => {
    const rows = objectTableOf(input)
    const ids = new Set(rows.map((r) => r.id))
    for (const r of rows) {
      if (r.parent_id !== null) expect(ids.has(r.parent_id)).toBe(true)
    }
  })
})

describe('同じ入力（仕様 7）', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const before = JSON.stringify(input)
    expect(objectTableOf(input)).toEqual(objectTableOf(input))
    expect(JSON.stringify(input)).toBe(before)
  })
})
