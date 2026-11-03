// 仕様: 向きを合わせる（D-04 P2「向きを合わせる」、A-03 G64・G18）。建物の最初の辺を、前面道路の辺に平行にそろえる。
// 仕様 1: 建物を、最初の辺の向きが道路の向きと一致する（180° の周期で）ように、中心まわりに回す。
// 仕様 2: 回した後も面積と辺の長さは変わらない。
// 仕様 3: 回す角度は、道路の向きとの差（−90°〜90°の範囲）で決まる。
import { describe, expect, it } from 'vitest'
import { alignToDirection, rotationToDirection } from './alignToRoad'
import { polygonAreaMm2 } from '../geom/polygon'

const edgeDeg = (p: { x: number; y: number }[]) => {
  const d = (Math.atan2(p[1]!.y - p[0]!.y, p[1]!.x - p[0]!.x) * 180) / Math.PI
  return ((d % 180) + 180) % 180
}

// 30° 傾いた 10 m × 6 m の建物
const tilted = (() => {
  const rad = (30 * Math.PI) / 180
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  return [
    { x: 0, y: 0 },
    { x: 10_000 * c, y: 10_000 * s },
    { x: 10_000 * c - 6_000 * s, y: 10_000 * s + 6_000 * c },
    { x: -6_000 * s, y: 6_000 * c },
  ].map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
})()

describe('alignToDirection（道路の向きに合わせる）', () => {
  it('最初の辺を、道路の向き（0°）に平行にする', () => {
    const aligned = alignToDirection(tilted, 0)
    // 辺の向きは 180° の周期（0° と 180° は同じ向き）
    const diff = Math.abs(edgeDeg(aligned))
    expect(Math.min(diff, 180 - diff)).toBeLessThan(0.5)
  })

  it('面積は変わらない', () => {
    const aligned = alignToDirection(tilted, 0)
    expect(Math.abs(polygonAreaMm2(aligned) - polygonAreaMm2(tilted))).toBeLessThan(polygonAreaMm2(tilted) * 0.001)
  })

  it('回す角度は、道路の向きとの差で決まる', () => {
    expect(rotationToDirection(tilted, 0)).toBeCloseTo(-30, 0)
  })
})
