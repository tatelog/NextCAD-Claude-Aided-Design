// 仕様（ハブ A-03 G76「壁・開口」）: 住戸の中の壁と開口は、描いた線のうち、線の中点が住戸の区画にあるものを数える。
// 仕様 1: 種類が壁（wall）の線の中点が区画の中（辺の上を含む）にあれば、壁として 1 本と数える。
// 仕様 2: 種類が開口（opening）の線も同じように、開口として数える。
// 仕様 3: 種類が無い線（まだ意味づけされていない線）と、ほかの種類（柱など）は数えない。
// 仕様 4: 区画の外にある中点は数えない。辺の上の中点は区画の中とみなす（1 mm の誤差は許す）。
// 仕様 5: 入力を書き換えず、同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import type { Rect } from './candidateCells'
import { kindCountsIn, type KindPoint } from './unitWalls'

const CELL: Rect = { id: 'A', x0: 0, y0: 0, x1: 3000, y1: 6000 }

describe('住戸の壁と開口（仕様 1〜5）', () => {
  it('仕様 1・2: 区画の中（辺の上を含む）の壁と開口を数える', () => {
    const points: KindPoint[] = [
      { x: 1500, y: 0, kind: 'wall' },
      { x: 3000, y: 2000, kind: 'wall' },
      { x: 1000, y: 3000, kind: 'opening' },
    ]
    expect(kindCountsIn(CELL, points)).toEqual({ walls: 2, openings: 1 })
  })

  it('仕様 3: 種類が無い線と、壁・開口以外の種類は数えない', () => {
    const points: KindPoint[] = [
      { x: 1000, y: 1000, kind: null },
      { x: 1000, y: 2000, kind: 'column' },
    ]
    expect(kindCountsIn(CELL, points)).toEqual({ walls: 0, openings: 0 })
  })

  it('仕様 4: 区画の外の中点は数えない（1 mm の誤差は許す）', () => {
    const points: KindPoint[] = [
      { x: 3500, y: 1000, kind: 'wall' },
      { x: 3000.5, y: 1000, kind: 'wall' },
    ]
    expect(kindCountsIn(CELL, points)).toEqual({ walls: 1, openings: 0 })
  })

  it('仕様 5: 入力を書き換えず、同じ入力には同じ出力', () => {
    const points: KindPoint[] = [{ x: 1500, y: 0, kind: 'wall' }]
    expect(kindCountsIn(CELL, points)).toEqual(kindCountsIn(CELL, points))
    expect(points).toEqual([{ x: 1500, y: 0, kind: 'wall' }])
  })
})
