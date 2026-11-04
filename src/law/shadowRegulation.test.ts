// 仕様: 日影規制の判定（建築基準法 第56条の2・別表第四、D-04 P2「日影」、A-03 G54）。
// 仕様 1: 冬至日の 8:00〜16:00（日本時間）に、建物の影が規制の測定面（平均地盤面からの高さ）に落ちる時間を数える。
// 仕様 2: 測定面の点は敷地境界線の外側に、境界から水平距離 d の位置に置く。d が 10 m 以内は 10 m 以内の時間、10 m 超は 10 m 超の時間で判定する。
// 仕様 3: 建物の高さが規制の対象の高さ（minHeightMm）以下なら、その建物は対象外（判定しない）。別表第四は「超える」建築物が対象（K07）。
// 仕様 4: 規制時間を超えた点が一つでもあれば「不適合」。超えた量が最も大きい点を worst に返す。
// 仕様 5: 建物が無い、または対象外だけなら「適合」。影の形は shadowOf（底面と上面の影の凸包）。
// 注: 条例（東京都・江東区）の値は、この関数の引数で受ける。ここには数値を置かない（rule の値は呼び出し側）。
import { describe, expect, it } from 'vitest'
import { judgeShadow, type ShadowRule } from './shadowRegulation'

const lot = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 30_000 },
  { x: 0, y: 30_000 },
]
const center = { x: 10_000, y: 15_000 }
// 中高層（規制の値は仮置きの試験用。条例の値ではない）
const rule: ShadowRule = {
  measurementHeightM: 4,
  minHeightMm: 10_000,
  bands: [
    { maxDistanceM: 10, hours: 4 },
    { maxDistanceM: Infinity, hours: 2.5 },
  ],
}
const winterSolstice = new Date(Date.UTC(2026, 11, 22)) // 日付の基準（日本時間の日付）
const site = { lat: 35.673094, lon: 139.860149 }

// 幅・奥行 8 m の建物。既定は敷地の中心（cy 省略時）。cy で南北の位置を変える
function box(heightMm: number, halfW = 4_000, halfD = 4_000, cy = center.y) {
  return {
    footprint: [
      { x: center.x - halfW, y: cy - halfD },
      { x: center.x + halfW, y: cy - halfD },
      { x: center.x + halfW, y: cy + halfD },
      { x: center.x - halfW, y: cy + halfD },
    ],
    heightMm,
  }
}

describe('judgeShadow（日影規制の判定）', () => {
  it('建物が無ければ適合', () => {
    const r = judgeShadow({ lot, buildings: [], rule, ...site, date: winterSolstice })
    expect(r.result).toBe('適合')
    expect(r.worst).toBeNull()
  })

  it('規制の対象の高さ未満の建物（6 m）は対象外で、適合', () => {
    const r = judgeShadow({ lot, buildings: [box(6_000)], rule, ...site, date: winterSolstice })
    expect(r.result).toBe('適合')
  })

  it('規制の対象の高さ（10 m）ちょうどの建物は対象外（別表第四は「10mを超える」建築物が対象）', () => {
    // 北の境界寄せ・10m の建物は、超える建物なら影が境界の外に届くため、対象外なら判定が始まらない（最大時間 0）
    const r = judgeShadow({ lot, buildings: [box(10_000, 4_000, 4_000, 26_000)], rule, ...site, date: winterSolstice })
    expect(r.result).toBe('適合')
    expect(r.maxHours).toBe(0)
  })

  it('敷地の北の境界に寄せた高い建物（200 m）は、境界の外の近い点で規制時間を超えて不適合', () => {
    // 北の辺（y = 30 m）に建物の北面を寄せる。影は北へ伸びる（冬至）
    const r = judgeShadow({ lot, buildings: [box(200_000, 4_000, 4_000, 26_000)], rule, ...site, date: winterSolstice })
    expect(r.result).toBe('不適合')
    expect(r.worst).not.toBeNull()
    expect(r.worst!.hours).toBeGreaterThan(r.worst!.limit)
  })

  it('敷地の真ん中の建物は、境界から遠いので適合（同じ高さでも）', () => {
    const r = judgeShadow({ lot, buildings: [box(200_000)], rule, ...site, date: winterSolstice })
    expect(r.result).toBe('適合')
  })

  it('worst は規制時間との差が最も大きい点（距離と時間と上限を返す）', () => {
    const r = judgeShadow({ lot, buildings: [box(200_000, 4_000, 4_000, 26_000)], rule, ...site, date: winterSolstice })
    expect(r.worst!.distanceM).toBeGreaterThan(0)
    expect([4, 2.5]).toContain(r.worst!.limit)
  })

  it('同じ条件なら結果は同じ（決定論）', () => {
    const a = judgeShadow({ lot, buildings: [box(30_000, 4_000, 4_000, 26_000)], rule, ...site, date: winterSolstice })
    const b = judgeShadow({ lot, buildings: [box(30_000, 4_000, 4_000, 26_000)], rule, ...site, date: winterSolstice })
    expect(a).toEqual(b)
  })
})
