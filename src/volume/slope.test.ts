// 仕様: 斜線で各階を段状に切り取る（D-02 C5「斜線・日影の出力形」、A-03 G27 B）。
// 仕様 1（G27）: 斜線で各階の平面を切り取る。切り取りは境界線から内側へ、階の天端の高さ z に対して
//   d ≥ (z − 立ち上がり) ÷ 係数 の範囲だけを残す（d は境界線からの距離）。z が立ち上がり以下なら切らない。
// 仕様 2: 係数と立ち上がりは呼び出し側が渡す（法規の値はこの関数に書かない。T-07 の値を使う）。係数は 0 より大きく、立ち上がりは 0 以上。
// 仕様 3: 複数の境界があれば、その全部で切る（順に切る）。
// 仕様 4: 階ごとに天端は（i+1）× 階高。階の切り取りは、その階の天端の高さで行う。
// 仕様 5: 完全に切り取られた階は空の多角形になり、面積は 0。
// 仕様 6: 切り取り後の面積を、階ごとに返せる（切り取った後の建築面積・延床面積の元になる、G27）。
import { describe, expect, it } from 'vitest'
import { cutFootprint, cutFloors } from './slope'
import { polygonAreaMm2 } from '../geom/polygon'

const rect = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 30_000 },
  { x: 0, y: 30_000 },
]

// 西側の境界線（x = 0）。内側は x > 0 の向き
const west = { point: { x: 0, y: 0 }, inward: { x: 1, y: 0 }, coefficient: 1.25, riseMm: 20_000 }
// 東側の境界線（x = 20 m）。内側は x < 20 m の向き
const east = { point: { x: 20_000, y: 0 }, inward: { x: -1, y: 0 }, coefficient: 1.25, riseMm: 20_000 }

describe('cutFootprint（一階の天端の高さでの切り取り）', () => {
  it('天端 30 m、立ち上がり 20 m、係数 1.25 なら、西の境界から 8 m を切る', () => {
    const r = cutFootprint(rect, [west], 30_000)
    expect(polygonAreaMm2(r)).toBe(12_000 * 30_000)
  })

  it('天端が立ち上がり以下なら切らない', () => {
    const r = cutFootprint(rect, [west], 20_000)
    expect(polygonAreaMm2(r)).toBe(20_000 * 30_000)
  })

  it('複数の境界で、それぞれ切り取る', () => {
    const r = cutFootprint(rect, [west, east], 30_000)
    expect(polygonAreaMm2(r)).toBe(4_000 * 30_000)
  })

  it('完全に切り取られれば空、面積は 0', () => {
    const steep = { ...west, coefficient: 0.1, riseMm: 0 }
    const r = cutFootprint(rect, [steep], 30_000)
    expect(r).toEqual([])
    expect(polygonAreaMm2(r)).toBe(0)
  })

  it('係数が 0 以下、または立ち上がりが負なら弾く', () => {
    expect(() => cutFootprint(rect, [{ ...west, coefficient: 0 }], 30_000)).toThrow()
    expect(() => cutFootprint(rect, [{ ...west, riseMm: -1 }], 30_000)).toThrow()
  })
})

describe('cutFloors（階ごとの切り取り）', () => {
  it('階の天端（i+1）× 階高で切り、階ごとの面積を返す', () => {
    // 係数 1、立ち上がり 0 の西の境界。天端 3, 6, 9 m で d ≥ 3, 6, 9 m を切る
    const simple = { ...west, coefficient: 1, riseMm: 0 }
    const floors = cutFloors(rect, [simple], { storey_count: 3, storey_height: 3_000 })
    expect(floors.map((f) => polygonAreaMm2(f))).toEqual([
      (20_000 - 3_000) * 30_000,
      (20_000 - 6_000) * 30_000,
      (20_000 - 9_000) * 30_000,
    ])
  })
})
