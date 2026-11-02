// 仕様: D-02 C5「押し出しの計算」: 外形を階数分、階高で押し出す。建物の高さは階数と階高の積。
// 塔屋や手すりは含めない。D-03 E-09: storey_count（階、整数）、storey_height（mm、整数）、
// total_height（mm）、footprint（整数 mm の多角形）。
// 建築面積は footprint の面積、延床面積は footprint の面積 × 階数（段状の切り取り前。G27 は次の一枚）。
import { describe, expect, it } from 'vitest'
import { extrudeVolume } from './extrude'

const rect = [
  { x: 0, y: 0 },
  { x: 10_000, y: 0 },
  { x: 10_000, y: 20_000 },
  { x: 0, y: 20_000 },
]

describe('extrudeVolume', () => {
  it('高さ = 階数 × 階高、建築面積 = 外形の面積、延床面積 = 建築面積 × 階数', () => {
    const v = extrudeVolume({ footprint: rect, storey_count: 5, storey_height: 3_000 })
    expect(v.total_height).toBe(15_000)
    expect(v.building_area_mm2).toBe(200_000_000)
    expect(v.gross_floor_area_mm2).toBe(1_000_000_000)
    expect(v.footprint).toEqual(rect)
  })

  it('階数が 1 未満、または整数でなければ弾く', () => {
    expect(() => extrudeVolume({ footprint: rect, storey_count: 0, storey_height: 3_000 })).toThrow()
    expect(() => extrudeVolume({ footprint: rect, storey_count: 2.5, storey_height: 3_000 })).toThrow()
  })

  it('階高が 0 以下、または整数 mm でなければ弾く', () => {
    expect(() => extrudeVolume({ footprint: rect, storey_count: 3, storey_height: 0 })).toThrow()
    expect(() => extrudeVolume({ footprint: rect, storey_count: 3, storey_height: 2_999.5 })).toThrow()
  })

  it('外形の頂点が 3 つ未満なら弾く', () => {
    expect(() =>
      extrudeVolume({
        footprint: [
          { x: 0, y: 0 },
          { x: 1_000, y: 0 },
        ],
        storey_count: 1,
        storey_height: 3_000,
      }),
    ).toThrow()
  })

  it('入力の footprint を変更しない', () => {
    const copy = structuredClone(rect)
    extrudeVolume({ footprint: rect, storey_count: 2, storey_height: 3_000 })
    expect(rect).toEqual(copy)
  })
})
