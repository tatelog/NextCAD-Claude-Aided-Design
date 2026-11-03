// 仕様（ハブ A-03 G61・D-04 P4「住戸タイプ別」）: 内装の数量は、住戸タイプごとに「1 戸あたり × 戸数」で出す。
// 仕様 1: 部屋は、その中心が入っている区画（住戸）に属する。どの区画にも入らない部屋は、どの住戸にも入れない。
// 仕様 2: 住戸タイプごとに、戸数と、1 戸あたりの床・天井・壁クロス（階数分）を出す。合計は 1 戸あたり × 戸数。
// 仕様 3: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { breakdownByUnitType, roomsByUnit } from './unitTypeBreakdown'

const CELLS = [
  { id: 'A', x0: 0, y0: 0, x1: 3000, y1: 6000 },
  { id: 'B', x0: 3000, y0: 0, x1: 6000, y1: 6000 },
]
const ROOMS = [
  { id: 'r1', kind: '洋室' as const, x0: 0, y0: 0, x1: 3000, y1: 3000 },
  { id: 'r2', kind: '洋室' as const, x0: 3000, y0: 0, x1: 6000, y1: 3000 },
  { id: 'out', kind: '洋室' as const, x0: 9000, y0: 0, x1: 9500, y1: 500 },
]

describe('住戸タイプ別の内装（仕様 1〜3）', () => {
  it('仕様 1: 部屋の中心が入る区画に属する。どの区画にも入らない部屋は除く', () => {
    const by = roomsByUnit(ROOMS, CELLS)
    expect(by.get('A')?.map((r) => r.id)).toEqual(['r1'])
    expect(by.get('B')?.map((r) => r.id)).toEqual(['r2'])
    expect([...by.values()].flat().map((r) => r.id)).not.toContain('out')
  })

  it('仕様 2: 住戸タイプごとに戸数と、1 戸あたり × 戸数の合計を出す', () => {
    const units = [
      { id: 'A', type: 'ファミリー' },
      { id: 'B', type: 'ファミリー' },
    ]
    const rows = breakdownByUnitType(units, roomsByUnit(ROOMS, CELLS), { storeyCount: 2, ceilingHeightMm: 2400 })
    expect(rows).toHaveLength(1)
    const row = rows[0]!
    expect(row.type).toBe('ファミリー')
    expect(row.count).toBe(2)
    // 1 戸あたり: 部屋 1 つ = 3000 × 3000 = 9 ㎡（床）× 階数 2 = 18 ㎡。2 戸なら 36 ㎡
    expect(row.perUnit.floorM2).toBeCloseTo(18, 6)
    expect(row.total.floorM2).toBeCloseTo(36, 6)
  })

  it('仕様 3: 同じ入力には同じ出力で、入力を書き換えない', () => {
    const units = [{ id: 'A', type: 'ファミリー' }]
    const first = breakdownByUnitType(units, roomsByUnit(ROOMS, CELLS), { storeyCount: 1, ceilingHeightMm: 2400 })
    expect(breakdownByUnitType(units, roomsByUnit(ROOMS, CELLS), { storeyCount: 1, ceilingHeightMm: 2400 })).toEqual(first)
    expect(ROOMS[0]!.x1).toBe(3000)
  })
})
