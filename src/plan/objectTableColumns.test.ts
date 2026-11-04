// 仕様（ハブ A-03 G129。統括の依頼 2026-11-05）: オブジェクト表の集計用の列は面積（area_m2）と数量（quantity）だけ。
// それ以外の集計値は、kind と parent_id から都度計算する（行には持たない）。
// 仕様 1: 面積は、住戸・部屋・廊下・コア・縦シャフトの行に m² で入る。それ以外の行は null。
// 仕様 2: 数量は、置いた什器の行に 1 として入る。それ以外の行は null。
// 仕様 3: 行が持つ項目は、id・kind・attr・name・parent_id と、集計列の area_m2・quantity だけ。
import { describe, expect, it } from 'vitest'
import { objectTableOf, emptyObjectTableInput } from './objectTable'

const cell = { id: 'U1', x0: 0, y0: 0, x1: 3000, y1: 6000 }
const input = {
  ...emptyObjectTableInput(),
  cells: [cell],
  rooms: [{ id: 'U1-W1', kind: '洋室' as const, x0: 0, y0: 0, x1: 2000, y1: 3000 }],
  shafts: [{ id: 'PS-U1', kind: 'PS' as const, unitId: 'U1', x0: 0, y0: 0, x1: 600, y1: 600 }],
  corridors: [{ id: 'C1', x0: 3000, y0: 0, x1: 4600, y1: 9000 }],
  cores: [{ id: 'stairA', x0: 0, y0: 0, x1: 1000, y1: 2000 }],
  fixtures: [{ id: 'F1', item: 'キッチン', unitId: 'U1' } as never],
}

describe('オブジェクト表の集計列（G129）', () => {
  const rows = objectTableOf(input)
  const byId = (id: string) => rows.find((r) => r.id === id)!

  it('仕様 1: 面積は住戸・部屋・廊下・コア・縦シャフトの行に m² で入る', () => {
    expect(byId('U1').area_m2).toBeCloseTo(18, 10)
    expect(byId('U1-W1').area_m2).toBeCloseTo(6, 10)
    expect(byId('C1').area_m2).toBeCloseTo(14.4, 10)
    expect(byId('stairA').area_m2).toBeCloseTo(2, 10)
    expect(byId('PS-U1').area_m2).toBeCloseTo(0.36, 10)
  })

  it('仕様 1: 面積を持たない行（共用部のグループ）は null', () => {
    expect(byId('common').area_m2).toBeNull()
  })

  it('仕様 2: 数量は、置いた什器の行に 1。それ以外は null', () => {
    expect(byId('F1').quantity).toBe(1)
    expect(byId('U1').quantity).toBeNull()
    expect(byId('C1').quantity).toBeNull()
  })

  it('仕様 3: 行の項目は、id・kind・attr・name・parent_id と集計列（area_m2・quantity）だけ', () => {
    for (const r of rows) {
      expect(Object.keys(r).sort()).toEqual(['area_m2', 'attr', 'id', 'kind', 'name', 'parent_id', 'quantity'])
    }
  })
})
