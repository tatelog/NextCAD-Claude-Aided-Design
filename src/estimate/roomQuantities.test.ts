// 仕様: 部屋の内装の数量（P4「内装の内訳と数量」の床・天井・壁クロス）。部屋（P3 の仮置き）の合計から、階数分にする。
// 仕様 1: 床と天井は、全部屋の面積の合計 × 階数（m²）。
// 仕様 2: 壁クロスは、全部屋の周長 × 天井高 × 階数（m²）。部屋どうしの壁は二重に数える（仮置きの近似。印を付ける）。
// 仕様 3: 数量は未確定（仮置きの間取り）の印を付ける。
import { describe, expect, it } from 'vitest'
import { roomFinishTotals } from './roomQuantities'
import { splitUnitRooms } from '../plan/rooms'

describe('roomFinishTotals（部屋の内装の合計）', () => {
  it('床・天井は面積の合計 × 階数（m²）', () => {
    const rooms = splitUnitRooms({ id: 'L0', x0: 0, y0: 0, x1: 6000, y1: 6000 }) // 36 m²
    const t = roomFinishTotals(rooms, { storeyCount: 2, ceilingHeightMm: 2400 })
    expect(t.floor.quantity).toBeCloseTo(72, 6)
    expect(t.ceiling.quantity).toBeCloseTo(72, 6)
  })

  it('壁クロスは各部屋の周長 × 天井高 × 階数（m²）。未確定の印を付ける', () => {
    const rooms = splitUnitRooms({ id: 'L0', x0: 0, y0: 0, x1: 6000, y1: 6000 })
    const t = roomFinishTotals(rooms, { storeyCount: 1, ceilingHeightMm: 2400 })
    // 4 室 × 周長 12 m（3 m × 3 m の正方形）× 2.4 m
    expect(t.wall_cloth.quantity).toBeCloseTo(4 * 12 * 2.4, 6)
    expect(t.wall_cloth.provisional).toBe(true)
  })
})
