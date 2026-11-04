// 仕様: 法定の斜線を敷地の辺に当てて、階ごとに切り取る（建築基準法 第56条・別表第三。規則は src/law/slopeRules.ts）。
// 仕様 1（道路・第56条1項1号）: 高さ ≤ 係数 × d は、前面道路の反対側の境界線からの距離 d が別表の距離 D 以内の範囲だけ。
//   D を超えた部分には制限がない。したがって許される領域は d ≥ min(D, 天端 ÷ 係数)。
// 仕様 2（隣地・第56条1項2号）: 敷地の辺（前面道路以外）ごとに、天端 ÷ 係数 の内側へ入れない（立ち上がりを超えた分だけ）。
// 仕様 3（北側）: 低層・中高層では、真北側の辺の内側へ、立ち上がり 5 m・10 m 以上の分だけ入れない。
// 仕様 4: 規則が判定不能（用途地域の指定なし）の辺は切らず、判定不能として返す。
// 仕様 5: 結果は階ごとの平面。切り取りの値は呼び出し側の敷地（辺の割り当てと前面道路の幅員）から決まる。
import { describe, expect, it } from 'vitest'
import { legalBoundaries } from './legalSlope'
import { cutFloors } from './slope'
import { polygonAreaMm2 } from '../geom/polygon'

// 反時計回りの敷地 20 m × 30 m。辺 0（y = 0）が前面道路（幅 6 m、道路は y < 0 側）。
const parcel = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 30_000 },
  { x: 0, y: 30_000 },
]

describe('legalBoundaries（住居系・前面道路の辺が 0）', () => {
  const r = legalBoundaries({ footprint: parcel, roadEdgeIndex: 0, roadWidthMm: 6_000, zone: '住居系', farPercent: 200 })

  it('判定できる規則だけで境界を作り、判定不能は無い', () => {
    expect(r.pending).toEqual([])
    expect(r.boundaries.length).toBe(4) // 道路 1 本 + 隣地 3 辺（東・西・北）
  })

  it('階ごとの面積は、道路（d ≤ 20 m の範囲）と隣地（立ち上がり 20 m 超）の切り取り後の平面', () => {
    const floors = cutFloors(parcel, r.boundaries, { storey_count: 3, storey_height: 10_000 })
    const areas = floors.map((f) => polygonAreaMm2(f))
    // 1 階（天端 10 m）: 道路は d ≥ 8 m、隣地はまだ切らない → 20 m × (30 − 2) m
    expect(areas[0]).toBe(20_000 * 28_000)
    // 2 階（天端 20 m）: 道路は d ≥ 16 m（y ≥ 10 m）、隣地は立ち上がり 20 m ちょうどで切らない → 20 m × 20 m
    expect(areas[1]).toBe(20_000 * 20_000)
    // 3 階（天端 30 m）: 道路は d ≥ 20 m（y ≥ 14 m）、隣地は d ≥ 8 m（東・西）と 22 m 以下（北）→ 4 m × 8 m
    expect(areas[2]).toBe(4_000 * 8_000)
  })
})

describe('legalBoundaries（判定不能）', () => {
  it('用途地域の指定なしは判定不能として返し、その辺は切らない', () => {
    const r = legalBoundaries({ footprint: parcel, roadEdgeIndex: 0, roadWidthMm: 6_000, zone: '指定なし', farPercent: 200 })
    expect(r.pending.length).toBeGreaterThan(0)
    expect(r.boundaries).toEqual([])
  })
})
