// 仕様（統括の依頼 2026-11-06。直し B）: 作図は、作図の領域に収まるいちばん大きい標準の縮尺で描き、図枠の縮尺の欄に「1/○○」を書く。
// SC1: 標準の縮尺のうち、領域に収まるいちばん大きいもの（分母のいちばん小さいもの）を選ぶ。
// SC2: どの標準の縮尺でも収まらなければ null。
// SC3: 配置図は、その縮尺で描く（筆界の幅は 実寸 ÷ 縮尺）。
// SC4: 各階平面図も同じ（外形の幅は 実寸 ÷ 縮尺）。
// SC5: 標準の縮尺はすべて、図枠の縮尺の候補として受け付けられる。
import { describe, expect, it } from 'vitest'
import { frameSvg, drawingAreaOf } from '../law/permitFrameSvg'
import { chooseScaleOf, floorPlanOf, siteLayoutOf, STANDARD_SCALES } from './drawingSvg'

const AREA = drawingAreaOf('A3')
const sq = (x0: number, y0: number, x1: number, y1: number) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
]
/** path の d（M x y L x y … Z）の x の並びから、横幅（mm）を取る */
const widthOfPath = (d: string): number => {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
  const xs = nums.filter((_, i) => i % 2 === 0)
  return Math.max(...xs) - Math.min(...xs)
}

describe('縮尺の選び方（仕様 SC1・SC2）', () => {
  it('SC0: 標準の縮尺は 1/100〜1/2000 の十一個', () => {
    expect([...STANDARD_SCALES]).toEqual([100, 200, 250, 300, 400, 500, 600, 1000, 1200, 1500, 2000])
  })

  it('SC1: 領域に収まるいちばん大きい（分母のいちばん小さい）標準の縮尺を選ぶ', () => {
    const s = chooseScaleOf(20000, 30000, AREA)!
    expect(s).not.toBeNull()
    expect(20000 / s).toBeLessThanOrEqual(AREA.x1 - AREA.x0)
    expect(30000 / s).toBeLessThanOrEqual(AREA.y1 - AREA.y0)
    const i = STANDARD_SCALES.indexOf(s)
    if (i > 0) {
      const bigger = STANDARD_SCALES[i - 1]!
      expect(20000 / bigger > AREA.x1 - AREA.x0 || 30000 / bigger > AREA.y1 - AREA.y0).toBe(true)
    }
  })

  it('SC2: どの標準の縮尺でも収まらなければ null', () => {
    expect(chooseScaleOf(1e7, 1e7, AREA)).toBeNull()
  })
})

describe('縮尺で描く（仕様 SC3・SC4）', () => {
  it('SC3: 配置図は選んだ縮尺で描く（筆界の幅 ＝ 実寸 ÷ 縮尺）', () => {
    const r = siteLayoutOf({ lot: sq(0, 0, 20000, 30000), footprint: sq(2000, 3000, 18000, 27000), neighbors: [], area: AREA })!
    expect(r).not.toBeNull()
    const d = r.body.match(/data-role="lot" d="([^"]+)"/)![1]!
    expect(widthOfPath(d)).toBeCloseTo(20000 / r.denominator, 1)
    expect(r.denominator).toBe(chooseScaleOf(20000, 30000, AREA))
  })

  it('SC4: 各階平面図も選んだ縮尺で描く（外形の幅 ＝ 実寸 ÷ 縮尺）', () => {
    const r = floorPlanOf({ widthMm: 16000, depthMm: 12000, gridLines: [], units: [{ id: 'u', x0: 0, y0: 0, x1: 16000, y1: 12000 }], area: AREA })!
    expect(r).not.toBeNull()
    const w = Number(r.body.match(/data-role="outline" x="[^"]+" y="[^"]+" width="([^"]+)"/)![1])
    expect(w).toBeCloseTo(16000 / r.denominator, 1)
  })
})

describe('縮尺の表示（仕様 SC5）', () => {
  it('SC5: 標準の縮尺は、図枠の縮尺の欄に「1/○○」として受け付けられる', () => {
    for (const s of STANDARD_SCALES) {
      expect(() => frameSvg({ size: 'A3', values: { scale: `1/${s}` } })).not.toThrow()
    }
  })
})
