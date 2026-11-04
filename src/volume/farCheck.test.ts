// 仕様: 容積率の判定（A-03 G28「入力が足りないときは判定不能」、D-02 C4・C5、D-04 P2 結果の欄）。
// 仕様 1: 上限（%）が無ければ「判定不能」。推測で埋めない（G28）。
// 仕様 2: 容積率（比）× 100 が上限（%）以下なら「適合」（同じ値も適合）。超えれば「不適合」。
// 仕様 3: 上限は 0 より大きい数。0 以下は弾く。
// 注: 前面道路による容積率の制限（G16）は別の判定で、ここには含めない。
import { describe, expect, it } from 'vitest'
import { judgeFar } from './farCheck'

describe('judgeFar（容積率の判定）', () => {
  it('上限が無ければ判定不能', () => {
    expect(judgeFar(2.0, undefined)).toBe('判定不能')
  })

  it('容積率が上限以下なら適合、超えれば不適合', () => {
    expect(judgeFar(1.5, 200)).toBe('適合')
    expect(judgeFar(2.5, 200)).toBe('不適合')
  })

  it('ちょうど上限の値は適合', () => {
    expect(judgeFar(2.0, 200)).toBe('適合')
  })

  it('上限が 0 以下なら弾く', () => {
    expect(() => judgeFar(1.5, 0)).toThrow()
    expect(() => judgeFar(1.5, -100)).toThrow()
  })
})
