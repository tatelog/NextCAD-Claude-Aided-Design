// 仕様（統括の決定 2026-11-06。前面道路の辺を、2D の平面で番号で選べるようにする。代表「各辺に番号をナンバリングして」）:
// 仕様 EL1: 筆界の辺の数だけ番号（0〜n−1）を返す。番号は辺の順（頂点 i → i+1）。
// 仕様 EL2: 各番号は、その辺の中点にあり、外向き（筆界の内側から外へ向く）。辺の向き（反時計回り・時計回り）によらない。
// 仕様 EL3: 選んでいる前面道路の辺だけが selected（色を変える印）。
import { describe, expect, it } from 'vitest'
import { lotEdgeLabelsOf } from './lot'

const CCW = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 30_000 },
  { x: 0, y: 30_000 },
]
const CW = [...CCW].reverse()

const centroidOf = (poly: readonly { x: number; y: number }[]) => ({
  x: poly.reduce((s, p) => s + p.x, 0) / poly.length,
  y: poly.reduce((s, p) => s + p.y, 0) / poly.length,
})

describe('筆界の辺の番号（仕様 EL1〜EL3）', () => {
  it('仕様 EL1: 辺の数だけ番号を返し、順は頂点 i → i+1 の辺の順', () => {
    const labels = lotEdgeLabelsOf(CCW, 0)
    expect(labels.map((l) => l.index)).toEqual([0, 1, 2, 3])
    expect(labels[0]!.mid).toEqual({ x: 10_000, y: 0 })
    expect(labels[1]!.mid).toEqual({ x: 20_000, y: 15_000 })
  })

  it('仕様 EL2: 番号は外向き。反時計回りでも時計回りでも、筆界の中心から外へ向く', () => {
    for (const poly of [CCW, CW]) {
      const c = centroidOf(poly)
      for (const l of lotEdgeLabelsOf(poly, 0)) {
        const outFromCenter = (l.mid.x - c.x) * l.outward.x + (l.mid.y - c.y) * l.outward.y
        expect(outFromCenter).toBeGreaterThan(0)
        expect(Math.hypot(l.outward.x, l.outward.y)).toBeCloseTo(1, 9)
      }
    }
  })

  it('仕様 EL3: 選んでいる前面道路の辺だけが selected', () => {
    const labels = lotEdgeLabelsOf(CCW, 2)
    expect(labels.filter((l) => l.selected).map((l) => l.index)).toEqual([2])
  })
})
