// 仕様: 斜線の境界は、どの斜線か（道路・北側・隣地）を持つ。図書の「道路斜線」の判定を、他の斜線と分けて出すため。
// 仕様 1: 前面道路の境界は kind が 'road'。
// 仕様 2: 隣地の境界は kind が 'adjacent'。
// 仕様 3: 真北を渡したときの北側の境界は kind が 'north'。
// 仕様 4: 道路の規則が判定不能（指定なし）のときは道路の境界を作らない（推測で作らない）。
import { describe, expect, it } from 'vitest'
import { legalBoundaries } from './legalSlope'

const rect = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 30_000 },
  { x: 0, y: 30_000 },
]

describe('legalBoundaries の kind（どの斜線か）', () => {
  it('道路・隣地・北側の境界に、それぞれ kind が付く', () => {
    const r = legalBoundaries({
      footprint: rect,
      roadEdgeIndex: 0,
      roadWidthMm: 6_000,
      zone: '中高層住専',
      farPercent: 200,
      trueNorth: { x: 0, y: 1 },
    })
    const kinds = r.boundaries.map((b) => b.kind)
    expect(kinds).toContain('road')
    expect(kinds).toContain('adjacent')
    expect(kinds).toContain('north')
    expect(r.boundaries.filter((b) => b.kind === 'road')).toHaveLength(1)
  })

  it('道路の規則が判定不能（指定なし）なら、道路の境界を作らない', () => {
    const r = legalBoundaries({
      footprint: rect,
      roadEdgeIndex: 0,
      roadWidthMm: 6_000,
      zone: '指定なし',
      farPercent: 200,
    })
    expect(r.boundaries.some((b) => b.kind === 'road')).toBe(false)
    expect(r.pending.length).toBeGreaterThan(0)
  })
})
