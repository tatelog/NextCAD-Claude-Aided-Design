// 仕様（ハブ A-03 G152。統括の依頼 2026-11-05、t81）: P3 の平面の描く画面（P3Canvas）にも、P2 と同じ直線・曲線と「円弧（二点）」を入れる。
// 仕様 1（座標）: 画面 1 px = 10 mm。原点は画面の中央。y は上向き（画面の y は下向き）。
// 仕様 2（円弧の線）: 二点の円弧の点列は、画面の座標で持つ。mm に戻すと円弧の点列どおり。
// 仕様 3（曲線）: 円弧の線は曲線モード（pen_mode: curve）で、中心と向き（mm）を線に残す（G5）。
import { describe, expect, it } from 'vitest'
import { arcFromTwoPoints } from '../input/arc'
import { P3_H, P3_MM_PER_PX, P3_W, p3ArcStroke, p3MmToPx, p3PxToMm } from './p3CanvasGeometry'

describe('P3 の描く画面の座標（t81 仕様 1）', () => {
  it('画面 1 px = 10 mm、原点は画面の中央、y は上向き', () => {
    expect(P3_MM_PER_PX).toBe(10)
    expect(p3PxToMm({ x: P3_W / 2, y: P3_H / 2 })).toEqual({ x: 0, y: 0 })
    // 右へ 10 px・上へ 10 px（画面の y は下向きなので y は減る）
    expect(p3PxToMm({ x: P3_W / 2 + 10, y: P3_H / 2 - 10 })).toEqual({ x: 100, y: 100 })
    expect(p3MmToPx({ x: 100, y: 100 })).toEqual({ x: P3_W / 2 + 10, y: P3_H / 2 - 10 })
  })
})

describe('P3 の円弧の線（t81 仕様 2・3）', () => {
  const arc = arcFromTwoPoints({ x: -1000, y: 0 }, { x: 1000, y: 0 }, 1000)

  it('仕様 2: 画面の座標で持ち、mm に戻すと円弧の点列どおり', () => {
    const stroke = p3ArcStroke(arc, 'arc-1')
    expect(stroke.points).toHaveLength(arc.points.length)
    stroke.points.forEach((q, i) => {
      const mm = p3PxToMm({ x: q.px, y: q.py })
      expect(mm.x).toBeCloseTo(arc.points[i]!.x, 6)
      expect(mm.y).toBeCloseTo(arc.points[i]!.y, 6)
    })
  })

  it('仕様 3: 曲線モードで入り、中心と向き（mm）を線に残す', () => {
    const stroke = p3ArcStroke(arc, 'arc-1')
    expect(stroke.pen_mode).toBe('curve')
    expect(stroke.arc).toEqual({ center: { x: arc.center.x, y: arc.center.y }, ccw: arc.ccw })
  })
})
