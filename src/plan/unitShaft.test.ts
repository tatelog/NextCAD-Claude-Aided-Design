// 仕様（ハブ A-03 G58・D-04 P3「住戸の詳細」）: 住戸は、壁・開口・部屋・PS を入れる入れ物。PS は、その住戸の縦シャフト（自動作成で住戸ごとに一つ）。
// 仕様 1: 住戸の ID に対応する PS（kind が PS で unitId が一致）を返す。無ければ null。
// 仕様 2: EPS と DS（住戸に属さない縦シャフト）は、どの住戸の PS にも数えない。
// 仕様 3: 入力を書き換えない。同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { psOfUnit } from './unitDetail'

const shafts = [
  { id: 'PS-u1', kind: 'PS' as const, unitId: 'u1', x0: 100, y0: 200, x1: 700, y1: 800 },
  { id: 'PS-u2', kind: 'PS' as const, unitId: 'u2', x0: 6100, y0: 200, x1: 6700, y1: 800 },
  { id: 'EPS', kind: 'EPS' as const, x0: 0, y0: 0, x1: 600, y1: 600 },
  { id: 'DS', kind: 'DS' as const, x0: 0, y0: 9000, x1: 600, y1: 9600 },
]

describe('住戸の PS（仕様 1〜2）', () => {
  it('住戸の ID に対応する PS の位置を返す', () => {
    expect(psOfUnit('u1', shafts)).toEqual({ x0: 100, y0: 200, x1: 700, y1: 800 })
  })

  it('PS が無い住戸は null（EPS と DS は住戸に数えない）', () => {
    expect(psOfUnit('u9', shafts)).toBeNull()
  })
})

describe('同じ入力（仕様 3）', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const before = JSON.stringify(shafts)
    expect(psOfUnit('u2', shafts)).toEqual(psOfUnit('u2', shafts))
    expect(JSON.stringify(shafts)).toBe(before)
  })
})
