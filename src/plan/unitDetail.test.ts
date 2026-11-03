// 仕様（ハブ A-03 G76・D-04 P3「住戸の詳細」）: 図面で住戸をダブルクリックすると、その住戸の詳細が出る。詳細の中身は、区画（mm）と、隣の区画・廊下・外形・置いた什器から決める。決定論。
// 仕様 1（寸法）: 間口は区画の幅（x 方向）、奥行は区画の高さ（y 方向）、専有面積は m²（幅 × 奥行）。
// 仕様 2（隣戸）: 辺の長さが正の分だけ接する区画の ID を出す（角だけで接するのは隣戸ではない）。
// 仕様 3（廊下側）: 廊下の区画と辺で接する側を、上・下・左・右で出す。
// 仕様 4（外側）: 外形（建物の外周）の辺に接する側を、上・下・左・右で出す。
// 仕様 5（置いた什器）: その住戸に置いた什器だけを、品目の名前で出す（区画の無い什器や、ほかの住戸の什器は入らない）。
// 仕様 6（無い区画）: 区画の一覧に無い ID は null。
// 仕様 7（純粋）: 入力を書き換えない。同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import type { Rect } from './candidateCells'
import { FIXTURE_ITEMS, type Fixture } from './fixtures'
import { unitDetailOf } from './unitDetail'

// 建物は幅 6000・奥行 12000。A は左上、B は右上、C は左下。K は B の下の廊下（幅 1600）
const CELLS: Rect[] = [
  { id: 'A', x0: 0, y0: 0, x1: 3000, y1: 6000 },
  { id: 'B', x0: 3000, y0: 0, x1: 6000, y1: 6000 },
  { id: 'C', x0: 0, y0: 6000, x1: 3000, y1: 12000 },
]
const CORRIDORS: Rect[] = [{ id: 'K', x0: 3000, y0: 6000, x1: 6000, y1: 7600 }]
const OUTLINE = { W: 6000, D: 12000 }
const item = (label: string) => FIXTURE_ITEMS.find((i) => i.label === label)!.id
const FIXTURES: Fixture[] = [
  { id: 'fixture-1', item: item('キッチン'), unitId: 'A' },
  { id: 'fixture-2', item: item('便器'), unitId: 'B' },
  { id: 'fixture-3', item: item('収納'), unitId: null },
]
const SOURCES = { cells: CELLS, corridors: CORRIDORS, outline: OUTLINE, fixtures: FIXTURES }

describe('住戸の詳細（ダブルクリック。仕様 1〜7）', () => {
  it('仕様 1: 間口は幅、奥行は高さ、専有面積は m²', () => {
    const d = unitDetailOf('A', SOURCES)
    expect(d).toMatchObject({ id: 'A', frontageMm: 3000, depthMm: 6000, areaM2: 18 })
  })

  it('仕様 2: 辺で接する区画だけを隣戸にする（角で接するだけなら入らない）', () => {
    expect(unitDetailOf('A', SOURCES)?.neighbors).toEqual(['B', 'C'])
    expect(unitDetailOf('B', SOURCES)?.neighbors).toEqual(['A'])
    expect(unitDetailOf('C', SOURCES)?.neighbors).toEqual(['A'])
  })

  it('仕様 3: 廊下と辺で接する側を出す（B は下、A は廊下に接しない）', () => {
    expect(unitDetailOf('B', SOURCES)?.corridorSides).toEqual(['下'])
    expect(unitDetailOf('A', SOURCES)?.corridorSides).toEqual([])
  })

  it('仕様 4: 外形の外周に接する側を出す', () => {
    expect(unitDetailOf('A', SOURCES)?.outerSides).toEqual(['左', '上'])
    expect(unitDetailOf('B', SOURCES)?.outerSides).toEqual(['上', '右'])
    expect(unitDetailOf('C', SOURCES)?.outerSides).toEqual(['左', '下'])
  })

  it('仕様 5: その住戸に置いた什器だけを、品目の名前で出す', () => {
    expect(unitDetailOf('A', SOURCES)?.fixtures).toEqual(['キッチン'])
    expect(unitDetailOf('C', SOURCES)?.fixtures).toEqual([])
  })

  it('仕様 6: 区画の一覧に無い ID は null', () => {
    expect(unitDetailOf('Z', SOURCES)).toBeNull()
  })

  it('仕様 7: 入力を書き換えず、同じ入力には同じ出力', () => {
    const first = unitDetailOf('A', SOURCES)
    expect(unitDetailOf('A', SOURCES)).toEqual(first)
    expect(CELLS[0]).toEqual({ id: 'A', x0: 0, y0: 0, x1: 3000, y1: 6000 })
  })
})
