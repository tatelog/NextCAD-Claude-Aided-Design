// 仕様（統括の依頼 2026-11-06。依頼 5a「P4 の床版・型枠と、P5 の延べ面積を、P2 の切り取り後の階の面積にそろえる」）:
// 仕様 A（P5 の延床面積）: 切り取った階の面積の和を使う。階の面積が無い（階数が合わない）ときは、今までどおり押し出しの延床面積。
// 仕様 B（P4 の床版）: 床版・型枠・コンクリート・鉄筋は、切り取った階の面積の和に合わせる（外形 × 階数ではない）。階の面積が無いときは今までどおり。
// 仕様 C（三者一致）: 同じ外形と境界なら、P2 の延床面積 = P4 の床版の面積 = P5 の延床面積。
import { describe, expect, it } from 'vitest'
import { structureQuantities } from '../estimate/structureQuantities'
import { grossFloorAreaMm2, volumeAfterSlope } from './cutVolume'
import { extrudeVolume } from './extrude'

const rect = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 30_000 },
  { x: 0, y: 30_000 },
]
const west = { point: { x: 0, y: 0 }, inward: { x: 1, y: 0 }, coefficient: 1, riseMm: 0 }
const storeys = { storey_count: 3, storey_height: 3_000 }

describe('P5 の延床面積は、切り取った階の面積の和（仕様 A）', () => {
  it('階の面積があり、階数が合えば、その和', () => {
    expect(grossFloorAreaMm2(100, [10, 20, 30], 3)).toBe(60)
  })

  it('階の面積が無いとき、または階数が合わないときは、今までどおり押し出しの延床面積', () => {
    expect(grossFloorAreaMm2(100, undefined, 3)).toBe(100)
    expect(grossFloorAreaMm2(100, [10, 20], 3)).toBe(100)
  })
})

describe('P4 の床版は、切り取った階の面積の和に合わせる（仕様 B）', () => {
  const floors = volumeAfterSlope({ footprint: rect, ...storeys }, [west], 5e10).floor_areas_mm2

  it('床版の面積（m²）は、階の面積の和', () => {
    const q = structureQuantities(rect, storeys, undefined, undefined, floors)
    expect(q.slab.quantity).toBeCloseTo(floors.reduce((s, a) => s + a, 0) / 1_000_000, 6)
  })

  it('コンクリートの体積（m³）は、階の面積の和 × 厚さ', () => {
    const q = structureQuantities(rect, storeys, 150, undefined, floors)
    expect(q.concrete.quantity).toBeCloseTo((floors.reduce((s, a) => s + a, 0) * 150) / 1_000_000_000, 6)
  })

  it('階の面積が無いときは、今までどおり 外形 × 階数', () => {
    const q = structureQuantities(rect, storeys)
    expect(q.slab.quantity).toBeCloseTo((polygonArea(rect) / 1_000_000) * 3, 6)
  })
})

describe('P2・P4・P5 の延床面積は同じ値（仕様 C）', () => {
  it('切り取りのある外形で、P2 の延床面積 = P4 の床版 = P5 の延床面積', () => {
    const p2 = volumeAfterSlope({ footprint: rect, ...storeys }, [west], 5e10)
    const p5 = grossFloorAreaMm2(extrudeVolume({ footprint: rect, ...storeys }).gross_floor_area_mm2, p2.floor_areas_mm2, 3)
    const p4 = structureQuantities(rect, storeys, undefined, undefined, p2.floor_areas_mm2).slab.quantity * 1_000_000
    expect(p5).toBe(p2.gross_floor_area_mm2)
    expect(p4).toBeCloseTo(p2.gross_floor_area_mm2, 0)
    // 切り取りがあるので、押し出しの延床面積より小さい（今までの 9,451 m² に当たるずれ）
    expect(p2.gross_floor_area_mm2).toBeLessThan(extrudeVolume({ footprint: rect, ...storeys }).gross_floor_area_mm2)
  })
})

function polygonArea(p: readonly { x: number; y: number }[]): number {
  let s = 0
  for (let i = 0; i < p.length; i++) {
    const a = p[i]!
    const b = p[(i + 1) % p.length]!
    s += a.x * b.y - b.x * a.y
  }
  return Math.abs(s) / 2
}

// P4 の明細（オブジェクト表の床版の行）まで届くことを確かめる（統括の依頼 2026-11-06。依頼 5a）
import { detailLinesOfObjects, slabObjectRow } from '../estimate/estimateObjects'
import { DEFAULT_REBAR } from '../estimate/rebarCondition'

describe('P4 の床版の明細は、切り取った階の面積の和を使う（仕様 B）', () => {
  it('床版の行に階の面積を渡すと、床版（スラブ）の明細は階の面積の和（m²）', () => {
    const p2 = volumeAfterSlope({ footprint: rect, ...storeys }, [west], 5e10)
    const row = slabObjectRow(rect, storeys.storey_count, storeys.storey_height, p2.floor_areas_mm2)
    const slab = detailLinesOfObjects([row], DEFAULT_REBAR).find((l) => l.item === '床版（スラブ）')
    expect(slab?.quantity).toBeCloseTo(p2.gross_floor_area_mm2 / 1_000_000, 6)
  })
})

// 屋根防水（統括の依頼 2026-11-06。依頼 A）: 屋根は 1 階の切り取り後の面積（P2 の建築面積）。段状の最上階の屋根と各段のテラスを足すと、1 階の床の形になる。
import { exteriorRow } from '../estimate/estimateObjects'

describe('屋根防水は 1 階の切り取り後の面積（依頼 A）', () => {
  it('段状の建物では、屋根防水の数量は 1 階の面積（建築面積）。外形の面積ではない', () => {
    const p2 = volumeAfterSlope({ footprint: rect, ...storeys }, [west], 5e10)
    const row = exteriorRow(rect, storeys.storey_count, storeys.storey_height, p2.floor_areas_mm2[0])
    const roof = detailLinesOfObjects([row], DEFAULT_REBAR).find((l) => l.item === '屋根防水')
    expect(roof?.quantity).toBeCloseTo(p2.building_area_mm2 / 1_000_000, 6)
    expect(roof?.quantity).not.toBeCloseTo((20_000 * 30_000) / 1_000_000, 3)
  })

  it('1 階の面積が無いときは、今までどおり外形の面積', () => {
    const row = exteriorRow(rect, storeys.storey_count, storeys.storey_height)
    const roof = detailLinesOfObjects([row], DEFAULT_REBAR).find((l) => l.item === '屋根防水')
    expect(roof?.quantity).toBeCloseTo((20_000 * 30_000) / 1_000_000, 6)
  })
})

// 階数を P2 を開かずに変えたとき（統括の依頼 2026-11-06。依頼 B）: 切り取った階の面積は、外形・境界・今の階数から、その場で計算する。
import { cutFloorAreasOf } from './cutVolume'

describe('切り取った階の面積は、今の階数から計算する（依頼 B）', () => {
  it('階数が変わると、階の面積の数も変わる（古い階数の値を使わない）', () => {
    const five = cutFloorAreasOf(rect, [west], { storey_count: 5, storey_height: 3_000 })
    expect(five).toHaveLength(5)
    expect(five).toEqual(volumeAfterSlope({ footprint: rect, storey_count: 5, storey_height: 3_000 }, [west], 1).floor_areas_mm2)
  })

  it('境界が無いときは、外形の面積を各階に持つ（押し出しと同じ）', () => {
    const two = cutFloorAreasOf(rect, null, { storey_count: 2, storey_height: 3_000 })
    expect(two).toEqual([20_000 * 30_000, 20_000 * 30_000])
  })
})
