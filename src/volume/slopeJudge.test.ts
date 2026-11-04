// 仕様: 斜線の適合判定（D-02 C5、A-03 G27・G28、D-03 T-03 判定）。
// 仕様 1: 斜線で切る前と後の、階ごとの面積を比べる。すべての階で同じなら「適合」（建物は斜線の内側に収まる）。
// 仕様 2: 一階でも面積が減れば「超過」（段状に切る必要がある）。
// 仕様 3: 境界が無ければ「適合」（判定する規則が無いときは、切っていないのと同じ）。
// 注: 北側・道路の内訳は、この判定では分けない（境界に規則の名前を持たせていない）。
import { describe, expect, it } from 'vitest'
import { judgeSlope } from './slopeJudge'
import type { SlopeBoundary } from './slope'

const rect = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 30_000 },
  { x: 0, y: 30_000 },
]

const west: SlopeBoundary = { point: { x: 0, y: 0 }, inward: { x: 1, y: 0 }, coefficient: 1, riseMm: 0 }

describe('judgeSlope（斜線の適合）', () => {
  it('斜線で切らなくてよい（境界が外側にある）なら適合', () => {
    const far: SlopeBoundary = { point: { x: -100_000, y: 0 }, inward: { x: 1, y: 0 }, coefficient: 1, riseMm: 0 }
    expect(judgeSlope(rect, [far], { storey_count: 3, storey_height: 3_000 })).toBe('適合')
  })

  it('一階でも切られれば超過', () => {
    expect(judgeSlope(rect, [west], { storey_count: 3, storey_height: 3_000 })).toBe('超過')
  })

  it('境界が無ければ適合', () => {
    expect(judgeSlope(rect, [], { storey_count: 3, storey_height: 3_000 })).toBe('適合')
  })
})
