// 仕様: 全体図（右下の縮図）。描く物の範囲（外接する四角）を求め、縮図の表示の範囲にする。
// 仕様 1: 複数の多角形の範囲は、すべての点を囲む最小の四角。
// 仕様 2: 点が無ければ null（縮図を出さない）。
// 仕様 3: 範囲の幅・高さは 0 にならない（点が一つでも、1 mm の幅を持つ）。
import { describe, expect, it } from 'vitest'
import { boundsOf } from './mapBounds'

describe('boundsOf（全体図の範囲）', () => {
  it('複数の多角形を囲む四角', () => {
    const b = boundsOf([
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 },
      ],
      [
        { x: -4, y: 2 },
        { x: 3, y: 9 },
        { x: 1, y: -1 },
      ],
    ])
    expect(b).toEqual({ x0: -4, y0: -1, x1: 10, y1: 9 })
  })

  it('点が無ければ null', () => {
    expect(boundsOf([])).toBeNull()
    expect(boundsOf([[]])).toBeNull()
  })

  it('一点でも幅と高さは 1 以上', () => {
    const b = boundsOf([[{ x: 5, y: 5 }]])
    expect(b).toEqual({ x0: 5, y0: 5, x1: 6, y1: 6 })
  })
})
