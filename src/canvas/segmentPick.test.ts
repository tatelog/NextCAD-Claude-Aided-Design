// 仕様（代表の決定 G159。統括の依頼 2026-11-05「線を選ぶ操作」）:
// チャットのモードのとき、P2・P3 の線をタップで選ぶ。タップは、動かさずに離した操作。
// 仕様 2（当たり判定）: タップの位置に最も近い線を、閾値の中でだけ選ぶ。閾値の外は選ばない（null）。
// 仕様 3（タップと描く操作）: 動いた距離が閾値を超えたら、タップではない（描く操作として扱う）。
// 仕様 5（色）: 選んだ線は選んでいない線と違う色で出す。
import { describe, expect, it } from 'vitest'
import type { Segment } from '../model/schema'
import { isTapMove, segmentPickAt, strokeColorOf, SELECTED_COLOR } from './segmentPick'

const line = (id: string, x1: number, y1: number, x2: number, y2: number): Segment =>
  ({ id, x1, y1, x2, y2, stage: 'F9' }) as unknown as Segment

describe('線の当たり判定（仕様 2）', () => {
  it('タップの位置が閾値の中にある線を選ぶ', () => {
    expect(segmentPickAt([line('a', 0, 0, 1000, 0)], { x: 500, y: 50 }, 100)).toBe('a')
  })

  it('閾値の外なら、選ばない（null）', () => {
    expect(segmentPickAt([line('a', 0, 0, 1000, 0)], { x: 500, y: 50 }, 10)).toBeNull()
  })

  it('近い線が複数あれば、いちばん近い線を選ぶ', () => {
    const segs = [line('far', 0, 200, 1000, 200), line('near', 0, 40, 1000, 40)]
    expect(segmentPickAt(segs, { x: 500, y: 0 }, 300)).toBe('near')
  })
})

describe('タップと描く操作の区別（仕様 3）', () => {
  it('動いた距離が閾値以下ならタップ', () => {
    expect(isTapMove(2, 2, 6)).toBe(false)
  })

  it('動いた距離が閾値を超えたら、タップではない', () => {
    expect(isTapMove(10, 0, 6)).toBe(true)
  })
})

describe('選んだ線の色（仕様 5）', () => {
  it('選んだ線は選んだ色、選んでいない線は元の色', () => {
    expect(strokeColorOf('#1f2a44', true)).toBe(SELECTED_COLOR)
    expect(strokeColorOf('#1f2a44', false)).toBe('#1f2a44')
    expect(SELECTED_COLOR).not.toBe('#1f2a44')
  })
})
