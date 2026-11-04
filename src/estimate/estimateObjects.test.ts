import { describe, expect, it } from 'vitest'
import { detailLinesOfObjects, resolveUnitPriceRef, slabObjectRow } from './estimateObjects'
import type { ObjectRow } from '../plan/objectTable'

// 仕様（ハブ A-03 G86。統括の決定 2026-11-04）から書いたテスト。
// - 積算はオブジェクト表から集計する。床版（外形から出る躯体）も、オブジェクト表の 1 行（kind は other、属性 part は slab）として持つ。
// - 躯体の行の明細は、そのオブジェクトの行から出る（objectId を持つ）。
// - 単価の参照は、品目・単位・分類が一致する単価の行の id。一致しなければ null（未参照。利用者が単価を置くまで）。

const SQUARE = [
  { x: 0, y: 0 },
  { x: 10_000, y: 0 },
  { x: 10_000, y: 10_000 },
  { x: 0, y: 10_000 },
]
const wallRow: ObjectRow = { id: 'wall-1', kind: 'wall', attr: null, name: '壁', parent_id: null }

describe('床版をオブジェクト表の 1 行にする', () => {
  it('床版の行は kind が other で、属性に part（slab）と外形と階数を持つ', () => {
    const row = slabObjectRow(SQUARE, 3, 3000)
    expect(row.kind).toBe('other')
    expect(row.parent_id).toBeNull()
    expect(JSON.parse(row.attr!)).toEqual({ part: 'slab', footprint: SQUARE, storey_count: 3, storey_height: 3000 })
  })
})

describe('オブジェクト表から躯体の明細を出す', () => {
  it('床版の行から、4 行の明細が出る（壁の行からは出ない）', () => {
    const rows = [slabObjectRow(SQUARE, 3, 3000), wallRow]
    const lines = detailLinesOfObjects(rows, { coverMm: 30, joint: '重ね継手' })
    expect(lines).toHaveLength(4)
    expect(lines.every((l) => l.objectId === rows[0]!.id)).toBe(true)
  })

  it('被り厚を変えると、床版の明細のうち鉄筋の行だけが変わる', () => {
    const rows = [slabObjectRow(SQUARE, 3, 3000)]
    const a = detailLinesOfObjects(rows, { coverMm: 30, joint: '重ね継手' })
    const b = detailLinesOfObjects(rows, { coverMm: 50, joint: '重ね継手' })
    const changed = a.filter((l, i) => l.quantity !== b[i]!.quantity).map((l) => l.item)
    expect(changed).toEqual(['鉄筋（床版）'])
  })

  it('床版の行が無ければ、躯体の明細は空', () => {
    expect(detailLinesOfObjects([wallRow], { coverMm: 30, joint: '重ね継手' })).toEqual([])
  })
})

describe('単価の参照', () => {
  const prices = [
    { id: 'c-1', item: 'コンクリート（床版）', unit: 'm3', category: '躯体' as const },
    { id: 'f-1', item: 'コンクリート（床版）', unit: 'm2', category: '躯体' as const },
  ]

  it('品目・単位・分類が一致する単価の行の id を返す', () => {
    expect(resolveUnitPriceRef({ item: 'コンクリート（床版）', unit: 'm3', category: '躯体' }, prices)).toBe('c-1')
  })

  it('単位が違えば参照しない（null）', () => {
    expect(resolveUnitPriceRef({ item: 'コンクリート（床版）', unit: 't', category: '躯体' }, prices)).toBeNull()
  })

  it('品目が無ければ参照しない（null。利用者が単価を置くまで未参照）', () => {
    expect(resolveUnitPriceRef({ item: '鉄筋（床版）', unit: 't', category: '躯体' }, prices)).toBeNull()
  })
})
