// 仕様（統括の依頼 2026-11-06。依頼 C。P2 の外形から取った幅・奥行きを、自動作成の寸法に使う）:
// 仕様 23（閉じた矩形）: 閉じていて矩形の外形なら、その幅・奥行き（整数の mm）。
// 仕様 24（取れない）: 閉じていない、または矩形でない外形なら null（外形の寸法を使わない。今までどおり目標から寸法を決める）。
import { describe, expect, it } from 'vitest'
import { outlineFitOf } from './outlineFit'

const rect = [
  { x: 0, y: 0 },
  { x: 17_202, y: 0 },
  { x: 17_202, y: 46_600 },
  { x: 0, y: 46_600 },
]
const tri = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 3_000, y: 21_000 },
]

describe('外形の幅・奥行きを取る（依頼 C）', () => {
  it('仕様 23: 閉じた矩形なら、その幅・奥行き', () => {
    expect(outlineFitOf(true, rect, 3)).toEqual({ widthMm: 17_202, depthMm: 46_600 })
  })

  it('仕様 24: 閉じていない、または矩形でないなら null', () => {
    expect(outlineFitOf(false, rect, 3)).toBeNull()
    expect(outlineFitOf(true, tri, 3)).toBeNull()
    expect(outlineFitOf(true, null, 3)).toBeNull()
  })
})
