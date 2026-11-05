// 仕様（統括の依頼 2026-11-05「P3 の Drawing で線が残らない」。動画で、キャンバスの外へ出たドラッグの線が消えた）:
// 仕様 1（線になる）: 軌跡が 2 点以上なら、その軌跡の線（段 F9）になる。点の数は軌跡のまま。
// 仕様 2（短い）: 軌跡が 1 点以下なら、線にならない（null）。
// 仕様 3（外で終わる）: ドラッグがキャンバスの外へ出た時点までの軌跡も、線になる（離れた位置で消さない）。
import { describe, expect, it } from 'vitest'
import { p3StrokeOfTrail } from './p3TrailStroke'

describe('P3 の軌跡の線（仕様 1〜3）', () => {
  it('仕様 1: 2 点以上の軌跡は、点の数を保った線（段 F9・直線）になる', () => {
    const s = p3StrokeOfTrail([{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 300, y: 120 }], 'line', 'id-1')
    expect(s).not.toBeNull()
    expect(s!.points).toHaveLength(3)
    expect(s!.stage).toBe('F9')
    expect(s!.pen_mode).toBe('line')
  })

  it('仕様 2: 1 点以下の軌跡は、線にならない', () => {
    expect(p3StrokeOfTrail([{ x: 100, y: 100 }], 'line', 'id-2')).toBeNull()
    expect(p3StrokeOfTrail(null, 'line', 'id-3')).toBeNull()
  })

  it('仕様 3: キャンバスの外へ出た時点までの軌跡も、線になる', () => {
    const outside = [{ x: 100, y: 100 }, { x: 400, y: 100 }, { x: 1200, y: 100 }]
    const s = p3StrokeOfTrail(outside, 'curve', 'id-4')
    expect(s).not.toBeNull()
    expect(s!.points).toHaveLength(3)
    expect(s!.pen_mode).toBe('curve')
  })
})
