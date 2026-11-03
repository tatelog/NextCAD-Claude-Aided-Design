// 仕様: 日影は、斜線で切った後の形で判定する（D-04 P2、切り取り後の階ごとの形）。
// 仕様 1: 切り取った階ごとの形（階の天端まで）の影は、切り取る前の建物の影より大きくならない（最も長い時間も、切り取る前以下）。
// 仕様 2: 判定の結果には、最も長い時間（maxHours）を返す。
// 仕様 3: 切り取った階は、階の天端の高さで建物として扱う（階ごとに 1 つの立体）。
import { describe, expect, it } from 'vitest'
import { judgeShadow, type ShadowRule } from './shadowRegulation'
import { cutFloors, type SlopeBoundary } from '../volume/slope'

const lot = [
  { x: 0, y: 0 },
  { x: 60_000, y: 0 },
  { x: 60_000, y: 60_000 },
  { x: 0, y: 60_000 },
]
const rule: ShadowRule = {
  measurementHeightM: 4,
  minHeightMm: 10_000,
  bands: [
    { maxDistanceM: 10, hours: 4 },
    { maxDistanceM: Infinity, hours: 2.5 },
  ],
}
// 北の辺（y = 60 m）に寄せた 20 m 四方の 5 階建て（階高 3 m）
const footprint = [
  { x: 20_000, y: 40_000 },
  { x: 40_000, y: 40_000 },
  { x: 40_000, y: 60_000 },
  { x: 20_000, y: 60_000 },
]
const storeys = { storey_count: 5, storey_height: 3_000 }
// 北の境界: 北向きの法線（内側は南）。係数 1.25、立ち上がり 0 の斜線
const north: SlopeBoundary = { point: { x: 0, y: 60_000 }, inward: { x: 0, y: -1 }, coefficient: 1.25, riseMm: 0 }
const date = new Date(Date.UTC(2026, 11, 22))
const site = { lat: 35.673094, lon: 139.860149 }

describe('日影の判定（切り取り後の形）', () => {
  it('切り取った階ごとの形の最も長い時間は、切り取る前以下', () => {
    const uncut = judgeShadow({ lot, buildings: [{ footprint, heightMm: 15_000 }], rule, ...site, date })
    const floors = cutFloors(footprint, [north], storeys)
    const cut = judgeShadow({
      lot,
      buildings: floors.map((f, i) => ({ footprint: f, heightMm: (i + 1) * storeys.storey_height })),
      rule,
      ...site,
      date,
    })
    expect(cut.maxHours).toBeLessThanOrEqual(uncut.maxHours)
  })

  it('判定の結果は最も長い時間（maxHours）を持つ', () => {
    const r = judgeShadow({ lot, buildings: [{ footprint, heightMm: 15_000 }], rule, ...site, date })
    expect(r.maxHours).toBeGreaterThan(0)
  })

  it('切り取った階は階ごとに 1 つの立体になる（空の階は除く）', () => {
    const floors = cutFloors(footprint, [north], storeys)
    expect(floors).toHaveLength(5)
  })
})
