// 仕様（統括の依頼 2026-11-06。1-c: 配置図と平面図を、図枠の作図領域に収める）:
// D1: 配置図は、確定した筆界・外形・周辺建物の輪郭を、作図領域の中に描く（それぞれ data-role で区別する）。
// D2: 縮尺は縦横比を保つ（一つの倍率で全体を縮める）。
// D3: 平面図は、外形の枠と、通り芯（横の線）と、住戸の区画（矩形）を描く。
// D4: 元のデータが無いときは、図を作らない（null）。
import { describe, expect, it } from 'vitest'
import { drawingAreaOf } from '../law/permitFrameSvg'
import { fitTransformOf, floorPlanBodyOf, siteLayoutBodyOf } from './drawingSvg'

const AREA = drawingAreaOf('A3')
const sq = (x0: number, y0: number, x1: number, y1: number) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
]

describe('配置図（仕様 D1・D2）', () => {
  const lot = sq(0, 0, 20000, 30000)
  const foot = sq(2000, 3000, 18000, 27000)
  const nb = [sq(-30000, 0, -25000, 5000)]

  it('D1: 筆界・外形・周辺建物の輪郭を、作図領域の中に描く', () => {
    const body = siteLayoutBodyOf({ lot, footprint: foot, neighbors: nb, area: AREA })
    expect(body).not.toBeNull()
    expect(body).toContain('data-role="lot"')
    expect(body).toContain('data-role="footprint"')
    expect(body).toContain('data-role="neighbor"')
    const all = [...lot, ...foot, ...nb[0]!]
    const t = fitTransformOf(all, AREA)
    for (const p of all) {
      const q = t(p)
      expect(q.x).toBeGreaterThanOrEqual(AREA.x0 - 1e-6)
      expect(q.x).toBeLessThanOrEqual(AREA.x1 + 1e-6)
      expect(q.y).toBeGreaterThanOrEqual(AREA.y0 - 1e-6)
      expect(q.y).toBeLessThanOrEqual(AREA.y1 + 1e-6)
    }
  })

  it('D2: 縦横比を保つ（筆界の縦横比 2:3 が、図の上でも 2:3）', () => {
    const t = fitTransformOf(lot, AREA)
    const a = t({ x: 0, y: 0 })
    const b = t({ x: 20000, y: 30000 })
    expect(Math.abs(b.x - a.x) / Math.abs(b.y - a.y)).toBeCloseTo(20000 / 30000, 6)
  })
})

describe('平面図（仕様 D3）', () => {
  it('D3: 外形の枠・通り芯（横の線）・住戸の区画（矩形）を描く', () => {
    const body = floorPlanBodyOf({
      widthMm: 16000,
      depthMm: 12000,
      gridLines: [3000, 6000, 9000],
      units: [
        { id: 'u1', x0: 0, y0: 0, x1: 8000, y1: 3000 },
        { id: 'u2', x0: 8000, y0: 0, x1: 16000, y1: 3000 },
      ],
      area: AREA,
    })
    expect(body).not.toBeNull()
    expect(body!.split('data-role="outline"')).toHaveLength(2)
    expect(body!.split('data-role="grid"')).toHaveLength(4)
    expect(body!.split('data-role="unit"')).toHaveLength(3)
  })
})

describe('元のデータが無いとき（仕様 D4）', () => {
  it('D4: 筆界も外形も無ければ配置図は作らない。住戸が無ければ平面図は作らない', () => {
    expect(siteLayoutBodyOf({ lot: null, footprint: null, neighbors: [], area: AREA })).toBeNull()
    expect(floorPlanBodyOf({ widthMm: 16000, depthMm: 12000, gridLines: [], units: [], area: AREA })).toBeNull()
  })
})
