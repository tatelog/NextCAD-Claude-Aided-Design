// 仕様: 斜線で切った後の形で、建築面積・延床面積・容積率を再計算する（A-03 G27 B、D-02 C5、D-03 T-02 ボリューム）。
// 仕様 1: 階ごとの面積は、切り取り後の階の平面の面積。
// 仕様 2: 延床面積 = 階ごとの面積の和。
// 仕様 3: 建築面積 = 1 階（地上階）の切り取り後の面積。上の階は下の階の内側に収まる（斜線は上へ行くほど狭くする）ので、建築面積は 1 階で決まる。
// 仕様 4: 容積率（比）= 延床面積 ÷ 敷地面積。敷地面積は 0 より大きい必要がある。
// 仕様 5: 切り取る境界がなければ、切り取り前の押し出しの結果と一致する（extrudeVolume）。
import { describe, expect, it } from 'vitest'
import { volumeAfterSlope } from './cutVolume'
import { extrudeVolume } from './extrude'

const rect = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 30_000 },
  { x: 0, y: 30_000 },
]

// 係数 1、立ち上がり 0 の西の境界（x = 0、内側は x > 0）
const west = { point: { x: 0, y: 0 }, inward: { x: 1, y: 0 }, coefficient: 1, riseMm: 0 }

describe('volumeAfterSlope（切り取り後の面積）', () => {
  it('階ごとの面積は切り取り後の平面、延床面積はその和、建築面積は 1 階', () => {
    const v = volumeAfterSlope({ footprint: rect, storey_count: 3, storey_height: 3_000 }, [west], 50_000_000_000 / 1)
    // 天端 3, 6, 9 m で d ≥ 3, 6, 9 m を切る
    expect(v.floor_areas_mm2).toEqual([(20_000 - 3_000) * 30_000, (20_000 - 6_000) * 30_000, (20_000 - 9_000) * 30_000])
    expect(v.building_area_mm2).toBe((20_000 - 3_000) * 30_000)
    expect(v.gross_floor_area_mm2).toBe((17_000 + 14_000 + 11_000) * 30_000)
  })

  it('容積率（比）= 延床面積 ÷ 敷地面積', () => {
    const parcelArea = 50_000 * 50_000
    const v = volumeAfterSlope({ footprint: rect, storey_count: 3, storey_height: 3_000 }, [west], parcelArea)
    expect(v.floor_area_ratio).toBeCloseTo(((17_000 + 14_000 + 11_000) * 30_000) / parcelArea)
  })

  it('切る境界がなければ、切り取り前の押し出しと一致する', () => {
    const v = volumeAfterSlope({ footprint: rect, storey_count: 3, storey_height: 3_000 }, [], 1_000_000_000)
    const plain = extrudeVolume({ footprint: rect, storey_count: 3, storey_height: 3_000 })
    expect(v.building_area_mm2).toBe(plain.building_area_mm2)
    expect(v.gross_floor_area_mm2).toBe(plain.gross_floor_area_mm2)
  })

  it('敷地面積が 0 以下なら弾く', () => {
    expect(() => volumeAfterSlope({ footprint: rect, storey_count: 3, storey_height: 3_000 }, [], 0)).toThrow()
  })
})
