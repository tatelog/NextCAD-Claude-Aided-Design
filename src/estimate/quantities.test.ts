// 仕様: P4 の数量の拾い方（D-02 C8「数量の拾い方」は仮置き、A-03 G62・G63、D-03 T-02 の区分）。
// 仕様 1（内装・室）: 床と天井は室の内法面積（m²）。壁のクロスは室の外周の長さ × 天井高（m²）。
// 仕様 2（外装・G62）: 外壁は外周 × 階高 × 階数（m²）。屋根は建築面積（m²）。
// 仕様 3（未決の控除）: 開口の控除は未決（D-02 C8）。控除していない外壁・壁の数量は provisional（未確定の印）を立てる。
// 仕様 4: 数量の単位は m²（mm² を 1e6 で割る）。長さは mm。
// 仕様 5: 区分（躯体・外装・内装・外構）を各数量に付ける（G63）。
import { describe, expect, it } from 'vitest'
import { roomFinishQuantities, buildingExteriorQuantities } from './quantities'

describe('roomFinishQuantities（内装・室）', () => {
  // 4 m × 3 m の室、天井高 2.4 m
  const room = [
    { x: 0, y: 0 },
    { x: 4_000, y: 0 },
    { x: 4_000, y: 3_000 },
    { x: 0, y: 3_000 },
  ]

  it('床と天井は内法面積（12 m²）、壁のクロスは外周 14 m × 2.4 m（33.6 m²）', () => {
    const q = roomFinishQuantities(room, 2_400)
    expect(q.floor.quantity).toBeCloseTo(12)
    expect(q.ceiling.quantity).toBeCloseTo(12)
    expect(q.wall_cloth.quantity).toBeCloseTo(33.6)
  })

  it('すべて区分は内装', () => {
    const q = roomFinishQuantities(room, 2_400)
    expect([q.floor.category, q.ceiling.category, q.wall_cloth.category]).toEqual(['内装', '内装', '内装'])
  })

  it('単位は m²', () => {
    const q = roomFinishQuantities(room, 2_400)
    expect(q.floor.unit).toBe('m2')
  })

  it('天井高が 0 以下なら弾く', () => {
    expect(() => roomFinishQuantities(room, 0)).toThrow()
  })
})

describe('buildingExteriorQuantities（外装・屋根）', () => {
  // 10 m × 20 m の建物、3 階、階高 3 m
  const footprint = [
    { x: 0, y: 0 },
    { x: 10_000, y: 0 },
    { x: 10_000, y: 20_000 },
    { x: 0, y: 20_000 },
  ]

  it('外壁は外周 60 m × 3 m × 3 階 = 540 m²、屋根は 200 m²', () => {
    const q = buildingExteriorQuantities(footprint, { storey_count: 3, storey_height: 3_000 })
    expect(q.exterior_wall.quantity).toBeCloseTo(540)
    expect(q.roof.quantity).toBeCloseTo(200)
  })

  it('外壁は開口を控除していないので未確定の印を立てる（控除は未決）', () => {
    const q = buildingExteriorQuantities(footprint, { storey_count: 3, storey_height: 3_000 })
    expect(q.exterior_wall.provisional).toBe(true)
    expect(q.exterior_wall.category).toBe('外装')
    expect(q.roof.category).toBe('外装')
  })

  it('階数 0 や階高 0 以下なら弾く', () => {
    expect(() => buildingExteriorQuantities(footprint, { storey_count: 0, storey_height: 3_000 })).toThrow()
    expect(() => buildingExteriorQuantities(footprint, { storey_count: 3, storey_height: 0 })).toThrow()
  })
})
