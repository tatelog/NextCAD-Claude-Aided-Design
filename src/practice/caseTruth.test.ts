// 仕様（ハブ A-03 G11。収集の案の JSON の形は草案・未確定。収集セッションの報告で決め直す）:
// 案（PracticeCase）は、id・型・間口と奥行（mm）・部屋の枠（mm、左上が原点）を持つ。
// 仕様 1: 正解の線は、部屋の枠どうしの境目（外周は含まない）。部屋の並び順は結果に影響しない。
// 仕様 2: 田の字（2×2 の 4 室）の正解は 2 本（縦 1・横 1）。
// 仕様 3: SVG の px を mm に直す。縮尺 = 間口（mm）÷ SVG の幅（px）。点 (30, 40) を 10 mm/px で直すと (300, 400)。
// 仕様 4: 入力を書き換えない。同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { truthLinesOfCase, mmScaleOf, pxToMm, type PracticeCase } from './caseTruth'

const grid2x2: PracticeCase = {
  id: '田の字-01',
  type: '田の字',
  widthMm: 6000,
  depthMm: 6000,
  rooms: [
    { x0: 0, y0: 0, x1: 3000, y1: 3000, kind: 'LDK' },
    { x0: 3000, y0: 0, x1: 6000, y1: 3000, kind: '洋室' },
    { x0: 0, y0: 3000, x1: 3000, y1: 6000, kind: '洋室' },
    { x0: 3000, y0: 3000, x1: 6000, y1: 6000, kind: '水回り' },
  ],
}

describe('正解の線（仕様 1〜2）', () => {
  it('田の字は 2 本（縦 1・横 1）', () => {
    expect(truthLinesOfCase(grid2x2)).toHaveLength(2)
  })

  it('部屋の並び順を変えても、正解の線は同じ（順序に依らない）', () => {
    const reversed = { ...grid2x2, rooms: [...grid2x2.rooms].reverse() }
    const key = (ls: ReturnType<typeof truthLinesOfCase>) => JSON.stringify(ls.map((l) => [l.a, l.b]).sort())
    expect(key(truthLinesOfCase(reversed))).toBe(key(truthLinesOfCase(grid2x2)))
  })
})

describe('px から mm（仕様 3）', () => {
  it('縮尺は 6000 mm ÷ 600 px = 10 mm/px。点 (30, 40) は (300, 400) mm', () => {
    expect(mmScaleOf(grid2x2, 600)).toBeCloseTo(10, 9)
    expect(pxToMm({ x: 30, y: 40 }, 10)).toEqual({ x: 300, y: 400 })
  })
})

describe('同じ入力・書き換えない（仕様 4）', () => {
  it('入力を書き換えず、同じ入力には同じ出力', () => {
    const before = JSON.stringify(grid2x2)
    expect(truthLinesOfCase(grid2x2)).toEqual(truthLinesOfCase(grid2x2))
    expect(JSON.stringify(grid2x2)).toBe(before)
  })
})
