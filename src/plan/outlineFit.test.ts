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

// 仕様（統括の依頼 2026-11-06。依頼 C。目標の戸数は寸法を決めず、外形に入る数と比べる）:
// 仕様 25（入らない）: 外形に入る数 M が目標 N より少ないとき、「入らない（入るのは M 戸）」。
// 仕様 26（多く入る）: M が N より多いとき、「目標より多く入る（M 戸）」。
// 仕様 27（目標どおり）: M と N が同じとき、「目標どおり」。
import { outlineFitTextOf } from './outlineFit'

describe('外形に入る数と目標の比べ方（依頼 C）', () => {
  it('仕様 25: 目標より少ないなら「入らない（入るのは M 戸）」', () => {
    expect(outlineFitTextOf(40, 30)).toBe('目標 40 戸に対し、外形に入るのは 30 戸。入らない（入るのは 30 戸）')
  })

  it('仕様 26: 目標より多いなら「目標より多く入る（M 戸）」', () => {
    expect(outlineFitTextOf(8, 30)).toBe('目標 8 戸に対し、外形に入るのは 30 戸。目標より多く入る（30 戸）')
  })

  it('仕様 27: 同じなら「目標どおり」', () => {
    expect(outlineFitTextOf(8, 8)).toBe('目標 8 戸に対し、外形に入るのは 8 戸。目標どおり')
  })
})
