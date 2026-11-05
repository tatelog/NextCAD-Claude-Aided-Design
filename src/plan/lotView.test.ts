// 仕様（統括の依頼 2026-11-06。1 件目: 描く画面の初めの表示を、選んだ筆に合わせる）:
// 仕様 21: 筆が無ければ、ダミー（20 m × 30 m）を今までどおりの倍率と原点で合わせる（800 × 600 px なら 62.5 mm/px、原点 (240, 540)）。
// 仕様 22: 選んだ筆の外接矩形は、画面の中に全部収まり、外接矩形の中心が画面の中心に来る。
// 仕様 23: 縦長の筆は高さの 80%、横長の筆は幅の 60% に収まる（従来と同じ割合）。
// 仕様 24: 外接矩形の大きさが 0 の筆は、落ちずにダミーに合わせる。
import { describe, expect, it } from 'vitest'
import { mmToPx, type Point } from '../geom/viewport'
import { lotOf } from './lot'
import { viewOfLot } from './lotView'

const W = 800
const H = 600
// 外接矩形: x −12 000〜14 000、y −18 000〜22 000（中心は (1 000, 2 000)）
const LOT: Point[] = [
  { x: -12_000, y: -18_000 },
  { x: 14_000, y: -18_000 },
  { x: 14_000, y: 6_000 },
  { x: 2_000, y: 6_000 },
  { x: 2_000, y: 22_000 },
  { x: -12_000, y: 22_000 },
]

describe('描く画面の初めの表示（仕様 21〜24）', () => {
  it('仕様 21: 筆が無ければ、ダミーを今までどおりの倍率と原点で合わせる', () => {
    const v = viewOfLot(lotOf(null), W, H)
    expect(v.mmPerPx).toBeCloseTo(62.5, 6)
    expect(v.originPx.x).toBeCloseTo(240, 6)
    expect(v.originPx.y).toBeCloseTo(540, 6)
  })

  it('仕様 22: 選んだ筆の外接矩形は画面に全部収まり、中心が画面の中心に来る', () => {
    const v = viewOfLot(LOT, W, H)
    const corners: Point[] = [
      { x: -12_000, y: -18_000 },
      { x: 14_000, y: -18_000 },
      { x: 14_000, y: 22_000 },
      { x: -12_000, y: 22_000 },
    ]
    for (const c of corners) {
      const p = mmToPx(v, c)
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(W)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(H)
    }
    const center = mmToPx(v, { x: 1_000, y: 2_000 })
    expect(center.x).toBeCloseTo(W / 2, 6)
    expect(center.y).toBeCloseTo(H / 2, 6)
  })

  it('仕様 23: 縦長の筆は高さの 80%、横長の筆は幅の 60% に収まる', () => {
    const tall: Point[] = [
      { x: 0, y: 0 },
      { x: 10_000, y: 0 },
      { x: 10_000, y: 40_000 },
      { x: 0, y: 40_000 },
    ]
    const vt = viewOfLot(tall, W, H)
    const bottom = mmToPx(vt, { x: 0, y: 0 })
    const top = mmToPx(vt, { x: 0, y: 40_000 })
    expect(Math.abs(bottom.y - top.y)).toBeCloseTo(H * 0.8, 6)

    const wide: Point[] = [
      { x: 0, y: 0 },
      { x: 40_000, y: 0 },
      { x: 40_000, y: 10_000 },
      { x: 0, y: 10_000 },
    ]
    const vw = viewOfLot(wide, W, H)
    const left = mmToPx(vw, { x: 0, y: 0 })
    const right = mmToPx(vw, { x: 40_000, y: 0 })
    expect(Math.abs(right.x - left.x)).toBeCloseTo(W * 0.6, 6)
  })

  it('仕様 24: 外接矩形の大きさが 0 の筆は、落ちずにダミーに合わせる', () => {
    const point: Point[] = [
      { x: 5_000, y: 5_000 },
      { x: 5_000, y: 5_000 },
      { x: 5_000, y: 5_000 },
      { x: 5_000, y: 5_000 },
    ]
    expect(viewOfLot(point, W, H)).toEqual(viewOfLot(lotOf(null), W, H))
  })
})
