import { describe, expect, it } from 'vitest'
import { judgeShadow } from './shadowRegulation'
import { shadowRuleFor } from './shadowRule'

// 仕様（別表第四 一項・四項イ、t27）から書いたテスト。
// 低層住居専用地域などは「軒の高さが7mを超える、又は地階を除く階数が3以上」が対象。
// 中高層・住居系は「高さが10mを超える」だけで対象（階数では決まらない）。
// judgeShadow は対象外の建物を判定しないので、最大の日影時間は 0 になる。

const lot = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 30_000 },
  { x: 0, y: 30_000 },
]
// 北の境界に寄せた建物（影が境界の外に届きうる位置）
function box(heightMm: number, storeys: number | undefined) {
  return {
    footprint: [
      { x: 6_000, y: 22_000 },
      { x: 14_000, y: 22_000 },
      { x: 14_000, y: 30_000 },
      { x: 6_000, y: 30_000 },
    ],
    heightMm,
    storeys,
  }
}
const site = { lat: 35.673094, lon: 139.860149 }
const winterSolstice = new Date(Date.UTC(2026, 11, 22))
const low = shadowRuleFor('低層住専', 1)!
const mid = shadowRuleFor('中高層住専', 1)!

describe('低層住専の日影の対象（軒高7m超か地階を除く3階以上、t27）', () => {
  it('高さ（軒高）6.5m・3階の建物は対象になる（3階以上だから）', () => {
    const r = judgeShadow({ lot, buildings: [box(6_500, 3)], rule: low, ...site, date: winterSolstice })
    expect(r.maxHours).toBeGreaterThan(0)
  })

  it('高さ（軒高）6.5m・2階の建物は対象外（判定しない）', () => {
    const r = judgeShadow({ lot, buildings: [box(6_500, 2)], rule: low, ...site, date: winterSolstice })
    expect(r.maxHours).toBe(0)
  })

  it('軒高7.5m・2階の建物は対象になる（軒高7mを超えるから）', () => {
    const r = judgeShadow({ lot, buildings: [box(7_500, 2)], rule: low, ...site, date: winterSolstice })
    expect(r.maxHours).toBeGreaterThan(0)
  })

  it('中高層住専は階数では対象にならない（高さ10mを超えるかどうかだけで決まる）', () => {
    const r = judgeShadow({ lot, buildings: [box(6_500, 3)], rule: mid, ...site, date: winterSolstice })
    expect(r.maxHours).toBe(0)
  })
})
