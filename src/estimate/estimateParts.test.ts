import { describe, expect, it } from 'vitest'
import { detailLinesOfObjects, exteriorRow, interiorRow, planExteriorRow, sashRow, siteRow } from './estimateObjects'
import type { ObjectRow } from '../plan/objectTable'
import { buildingExteriorQuantities } from './quantities'
import { roomFinishTotals } from './roomQuantities'
import { planExteriorQuantities, railingQuantity } from './planExterior'
import { siteWorksQuantity } from './siteWorks'
import { sashQuantity } from './sashQuantity'
import type { Room } from '../plan/rooms'
import type { Rect } from '../plan/candidateCells'

// 仕様（ハブ A-03 G86。統括の決定 2026-11-04）から書いたテスト。
// - 外装・内装・外構・サッシも、オブジェクト表の行から明細を出す（P4 の正本）。
// - 行から出した明細の数量は、今までの直接の計算（関数の戻り値）と同じになる（数字が変わらない）。
// - 単価の参照は、まだ決まっていないので null。印（provisional）は仮置きのまま。

const FOOTPRINT = [
  { x: 0, y: 0 },
  { x: 10_000, y: 0 },
  { x: 10_000, y: 6_000 },
  { x: 0, y: 6_000 },
]
const STOREYS = { storey_count: 3, storey_height: 3000 }
const ROOMS: Room[] = [{ id: 'r1', kind: 'LDK', x0: 0, y0: 0, x1: 4000, y1: 3000 }]
const CORRIDOR: Rect = { id: 'corridor', x0: 0, y0: -1200, x1: 10_000, y1: 0 }
const CORES: Rect[] = [{ id: 'core', x0: 0, y0: 0, x1: 1500, y1: 1500 }]
const CELLS: Rect[] = [{ id: 'cell1', x0: 0, y0: 0, x1: 5000, y1: 3000 }]
const OUTLINE = { W: 10_000, D: 6_000 }
const SEGMENTS = [{ id: 's1', x1: 0, y1: 0, x2: 2000, y2: 0 }]
const wallRow: ObjectRow = { id: 'wall-1', kind: 'wall', attr: null, name: '壁', parent_id: null }

describe('外装・内装・外構・サッシを、オブジェクト表の行から明細にする', () => {
  it('外壁と屋根の明細は、直接の計算と同じ数量（外装）', () => {
    const q = buildingExteriorQuantities(FOOTPRINT, STOREYS)
    const lines = detailLinesOfObjects([exteriorRow(FOOTPRINT, STOREYS.storey_count, STOREYS.storey_height)], { coverMm: 30, joint: '重ね継手' })
    expect(lines.map((l) => l.quantity)).toEqual([q.exterior_wall.quantity, q.roof.quantity])
    expect(lines.every((l) => l.category === '外装')).toBe(true)
  })

  it('外構の明細は、直接の計算と同じ数量（外構）', () => {
    const lines = detailLinesOfObjects([siteRow(FOOTPRINT, 20_000 * 30_000)], { coverMm: 30, joint: '重ね継手' })
    expect(lines).toHaveLength(1)
    expect(lines[0]!.quantity).toBe(siteWorksQuantity(20_000 * 30_000, FOOTPRINT).quantity)
    expect(lines[0]!.category).toBe('外構')
  })

  it('内装（床・天井・壁クロス）の明細は、直接の計算と同じ数量（内装）', () => {
    const t = roomFinishTotals(ROOMS, { storeyCount: 3, ceilingHeightMm: 2400 })
    const lines = detailLinesOfObjects([interiorRow(ROOMS, { storeyCount: 3, ceilingHeightMm: 2400 })], { coverMm: 30, joint: '重ね継手' })
    expect(lines.map((l) => l.quantity)).toEqual([t.floor.quantity, t.ceiling.quantity, t.wall_cloth.quantity])
    expect(lines.every((l) => l.category === '内装')).toBe(true)
  })

  it('バルコニー・共用廊下・手すりの明細は、直接の計算と同じ数量（外装）', () => {
    const input = { corridor: CORRIDOR, cores: CORES, cells: CELLS, outline: OUTLINE, storeyCount: 3 }
    const direct = planExteriorQuantities(input)
    const rail = railingQuantity({ cells: CELLS, outline: OUTLINE, storeyCount: 3 })
    const lines = detailLinesOfObjects([planExteriorRow(input)], { coverMm: 30, joint: '重ね継手' })
    expect(lines.map((l) => l.quantity)).toEqual([direct.balcony.quantity, direct.corridor.quantity, rail.quantity])
    expect(lines.every((l) => l.category === '外装')).toBe(true)
  })

  it('サッシの明細は、直接の計算と同じ数量（開口の種類の判定を含む）', () => {
    const kinds = { s1: 'opening' }
    const direct = sashQuantity(SEGMENTS, (id) => kinds[id as 's1'] ?? null)
    const lines = detailLinesOfObjects([sashRow(SEGMENTS, kinds)], { coverMm: 30, joint: '重ね継手' })
    expect(lines).toHaveLength(1)
    expect(lines[0]!.quantity).toBe(direct.quantity)
    expect(lines[0]!.category).toBe('外装')
  })

  it('部分の JSON でない行（住戸・壁など、属性が文字の行）は、明細を出さず、落とさない', () => {
    const text: ObjectRow = { id: 'unit-1', kind: 'group', attr: '住戸', name: '住戸', parent_id: null }
    expect(detailLinesOfObjects([text, wallRow], { coverMm: 30, joint: '重ね継手' })).toEqual([])
  })

  it('どの行の明細も、元の行の id と、単価の参照（未決は null）を持つ。印は元の数量の印を引き継ぐ', () => {
    const rows = [
      exteriorRow(FOOTPRINT, 3, 3000),
      siteRow(FOOTPRINT, 600_000_000),
      interiorRow(ROOMS, { storeyCount: 3, ceilingHeightMm: 2400 }),
    ]
    const lines = detailLinesOfObjects(rows, { coverMm: 30, joint: '重ね継手' })
    expect(lines.every((l) => l.unitPriceRef === null)).toBe(true)
    expect(new Set(lines.map((l) => l.lineId)).size).toBe(lines.length)
    // 屋根防水は元の計算で印なし（確定した面積）。明細も同じ
    const roof = buildingExteriorQuantities(FOOTPRINT, STOREYS).roof
    expect(lines.find((l) => l.item === roof.item)!.provisional).toBe(roof.provisional)
  })
})
