// 仕様（ハブ A-03 G5・G17「はみ出し」）: 外形が円弧（建物は円の内側にある）のとき、区画は四隅がすべて円の内側（許容 1 mm）にあるものだけを残す。
// 仕様 1: 四隅がすべて内側の区画は残す。どれか一つでも外の区画は除く（除外の id を返す）。
// 仕様 2: 円弧が無い（外形が矩形など）ときの判定は、呼び出し側が行う。ここでは扱わない。
// 仕様 3: 入力を書き換えず、同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import type { Rect } from './candidateCells'
import { cellsInsideArc } from './arcCells'

const ARC = { kind: 'arc' as const, a: { x: 0, y: -1000 }, b: { x: 0, y: 1000 }, center: { x: 0, y: 0 }, ccw: true }
const CELLS: Rect[] = [
  { id: 'in', x0: -800, y0: -200, x1: -200, y1: 200 },
  { id: 'out', x0: 900, y0: 0, x1: 1100, y1: 100 },
]

describe('円弧の外形に入る区画（仕様 1〜3）', () => {
  it('仕様 1: 四隅が円の内側の区画だけを残し、外の区画の id を除外に返す', () => {
    const out = cellsInsideArc(CELLS, ARC)
    expect(out.inside.map((c) => c.id)).toEqual(['in'])
    expect(out.outside).toEqual(['out'])
  })

  it('仕様 3: 同じ入力には同じ出力で、入力を書き換えない', () => {
    expect(cellsInsideArc(CELLS, ARC)).toEqual(cellsInsideArc(CELLS, ARC))
    expect(CELLS[1]).toEqual({ id: 'out', x0: 900, y0: 0, x1: 1100, y1: 100 })
  })
})
