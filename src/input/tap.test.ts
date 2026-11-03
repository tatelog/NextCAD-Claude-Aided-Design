// 仕様: D-04 共通部品「ペンのモード」・D-02 C1 ＋ G52（右クリックかダブルタップでサークルメニュー）。
// ダブルタップの判定値（300 ms・30 px）は仕様に無い仮置き。ここで固定して、変えるときはこの表を直す。
import { describe, expect, it } from 'vitest'
import { DOUBLE_TAP_MS, DOUBLE_TAP_PX, nextTap, type TapRecord } from './tap'

const tap = (t: number, x = 100, y = 100): TapRecord => ({ t, x, y })

describe('ダブルタップの判定（G52）', () => {
  it('仮置きの値は 300 ms と 30 px', () => {
    expect(DOUBLE_TAP_MS).toBe(300)
    expect(DOUBLE_TAP_PX).toBe(30)
  })

  it('最初のタップはダブルではない', () => {
    expect(nextTap(null, tap(0)).double).toBe(false)
  })

  it('300 ms 以内・30 px 以内の 2 回目はダブルタップ', () => {
    const first = tap(0, 100, 100)
    expect(nextTap(first, tap(299, 110, 100)).double).toBe(true)
  })

  it('300 ms を過ぎると、ダブルではない', () => {
    expect(nextTap(tap(0), tap(301)).double).toBe(false)
  })

  it('30 px を超えて離れると、ダブルではない', () => {
    expect(nextTap(tap(0, 100, 100), tap(100, 140, 100)).double).toBe(false)
  })

  it('ダブルタップの直後の 3 回目は、新しい 1 回目として扱う', () => {
    const second = nextTap(tap(0), tap(100))
    expect(second.double).toBe(true)
    expect(nextTap(second.next, tap(200)).double).toBe(false)
  })
})
