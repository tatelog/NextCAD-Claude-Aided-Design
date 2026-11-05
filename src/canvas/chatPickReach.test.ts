// 仕様（統括の依頼 2026-11-06。1: チャットのタップで、画面に見えている線（F5 も含む）を選べる）:
// 仕様 1a: 見えている線から 12 px 以内のタップで、その線を選ぶ（指で少し外れても選べる）。
// 仕様 1b: 段階が F5 の線も、F4 の線と同じく選ばれる（当たり判定の候補から外さない）。
import { describe, expect, it } from 'vitest'
import type { Segment } from '../model/schema'
import { CHAT_PICK_PX, segmentPickAt } from './segmentPick'

const seg = (id: string, stage: string, x1: number, y1: number, x2: number, y2: number): Segment =>
  ({ id, stage, x1, y1, x2, y2 }) as unknown as Segment

describe('チャットのタップで選べる範囲（仕様 1a・1b）', () => {
  it('仕様 1a: 見えている線から 12 px 以内のタップで選べる（許容は 12 px 以上）', () => {
    expect(CHAT_PICK_PX).toBeGreaterThanOrEqual(12)
    // 1 px = 1 mm の画面で、線から 10 px 離れたところをタップする
    expect(segmentPickAt([seg('a', 'F5', 0, 0, 1000, 0)], { x: 500, y: 10 }, CHAT_PICK_PX)).toBe('a')
  })

  it('仕様 1b: 段階が F5 の線も、F4 の線と同じく選ばれる', () => {
    expect(segmentPickAt([seg('f5', 'F5', 0, 0, 1000, 0)], { x: 500, y: 0 }, CHAT_PICK_PX)).toBe('f5')
    expect(segmentPickAt([seg('f4', 'F4', 0, 0, 1000, 0)], { x: 500, y: 0 }, CHAT_PICK_PX)).toBe('f4')
  })
})
