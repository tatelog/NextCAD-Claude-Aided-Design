// 仕様: EV コアの矩形の入力（D-04 P3 のコア、D-03 T-02 cores、A-03 G17）。
// 矩形は mm の整数。四隅がすべて空なら未入力（コアは 0 件）。一部だけ入っていれば不正。
// 幅・奥行きは 0 より大きい（x1 > x0、y1 > y0）。正しければ id は ev-1 にする。
import { describe, expect, it } from 'vitest'
import { parseCoreRect } from './coreRect'

describe('EV コアの矩形の入力', () => {
  it('四隅がすべて空なら未入力として、矩形も error もない', () => {
    expect(parseCoreRect({ x0: '', y0: '', x1: '', y1: '' })).toEqual({ rect: null, error: null })
  })

  it('四隅の一部だけ入っていれば、矩形を作らず error を返す', () => {
    const r = parseCoreRect({ x0: '5500', y0: '', x1: '6500', y1: '1500' })
    expect(r.rect).toBeNull()
    expect(r.error).toBe('コアは四隅すべてを入れる')
  })

  it('整数でない座標は不正とする', () => {
    const r = parseCoreRect({ x0: '5500.5', y0: '500', x1: '6500', y1: '1500' })
    expect(r.rect).toBeNull()
    expect(r.error).toBe('コアの座標は整数（mm）で入れる')
  })

  it('幅・奥行きが 0 以下なら不正とする', () => {
    expect(parseCoreRect({ x0: '6500', y0: '500', x1: '5500', y1: '1500' }).error).toBe('コアは x1 > x0 かつ y1 > y0')
    expect(parseCoreRect({ x0: '5500', y0: '1500', x1: '6500', y1: '1500' }).error).toBe('コアは x1 > x0 かつ y1 > y0')
  })

  it('正しければ矩形を返し、id は ev-1 になる', () => {
    expect(parseCoreRect({ x0: '5500', y0: '500', x1: '6500', y1: '1500' })).toEqual({
      rect: { id: 'ev-1', x0: 5500, y0: 500, x1: 6500, y1: 1500 },
      error: null,
    })
  })
})
