// 仕様（統括の依頼 2026-11-06。小さな直し: 範囲にかかる周辺建物は、範囲の枠で切って描く。丸ごと外さない）:
// CL1: 範囲にかかる建物は、範囲の枠で切って入る（丸ごと外さない。625-1 のすぐ隣の大きな建物が出るように）。
// CL2: 切った後の点は、すべて範囲の中にある（枠からはみ出さない）。
// CL3: 範囲の中にある建物は、切らずにそのまま入る（点は変わらない）。
// CL4: 範囲の外だけにある建物は、入らない。
import { describe, expect, it } from 'vitest'
import { nearSiteNeighborsOf, SITE_NEIGHBOR_MARGIN_MM } from './drawingSvg'

const sq = (x0: number, y0: number, x1: number, y1: number) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
]
// 基点（筆）の外接矩形は [0, 20000] × [0, 30000]。範囲は、そこから 40 m 外側まで
const BASE = sq(0, 0, 20000, 30000)
const BOX = { x0: -SITE_NEIGHBOR_MARGIN_MM, y0: -SITE_NEIGHBOR_MARGIN_MM, x1: 20000 + SITE_NEIGHBOR_MARGIN_MM, y1: 30000 + SITE_NEIGHBOR_MARGIN_MM }

describe('範囲にかかる周辺建物は、枠で切って入る（仕様 CL1〜CL4）', () => {
  it('CL1: 範囲の右の辺をまたぐ建物は、切られて 1 つ入る', () => {
    // 範囲の右の辺は x = 60000。x 50000〜70000 の建物は、x 50000〜60000 に切られる
    const straddle = sq(50000, 0, 70000, 10000)
    const out = nearSiteNeighborsOf(BASE, [straddle])
    expect(out).toHaveLength(1)
  })

  it('CL2: 切った後の点は、すべて範囲の中にある', () => {
    const out = nearSiteNeighborsOf(BASE, [sq(50000, 0, 70000, 10000), sq(-60000, -60000, -30000, -30000)])
    // 両方とも範囲にかかるので、両方が切られて入る（空では確かめにならない）
    expect(out).toHaveLength(2)
    for (const ring of out) {
      for (const p of ring) {
        expect(p.x).toBeGreaterThanOrEqual(BOX.x0 - 1e-6)
        expect(p.x).toBeLessThanOrEqual(BOX.x1 + 1e-6)
        expect(p.y).toBeGreaterThanOrEqual(BOX.y0 - 1e-6)
        expect(p.y).toBeLessThanOrEqual(BOX.y1 + 1e-6)
      }
    }
  })

  it('CL3: 範囲の中にある建物は、切らずにそのまま入る', () => {
    const inside = sq(-20000, 5000, -10000, 9000)
    expect(nearSiteNeighborsOf(BASE, [inside])).toEqual([inside])
  })

  it('CL4: 範囲の外だけにある建物は入らない', () => {
    expect(nearSiteNeighborsOf(BASE, [sq(100000, 0, 101000, 1000)])).toEqual([])
  })
})
