// 仕様（ハブ A-03 G11 練習。代表の決定 2026-11-04）: 利用者が案の上になぞって描いた線を、正解と照合して記録にする。
// 仕様 1: 描いた線（画面の px）は mm に直す。縮尺は間口（mm）÷ 表示の幅（px）。
// 仕様 2: 長さが 200 mm 未満の線（誤って触っただけ）は捨てる。
// 仕様 3: 描いた線を正解と照合し、案の番号・再現率・適合率の記録を作る（許容差は既定 50 mm）。
// 仕様 4: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { drawnLinesFromPx, scoreDrawing } from './practiceFlow'
import type { PracticeCase } from './caseTruth'

// 6000 mm × 6000 mm の田の字。表示の幅 600 px なので 1 px = 10 mm
const grid2x2: PracticeCase = {
  id: '田の字-01',
  type: '田の字',
  widthMm: 6000,
  depthMm: 6000,
  rooms: [
    { x0: 0, y0: 0, x1: 3000, y1: 3000 },
    { x0: 3000, y0: 0, x1: 6000, y1: 3000 },
    { x0: 0, y0: 3000, x1: 3000, y1: 6000 },
    { x0: 3000, y0: 3000, x1: 6000, y1: 6000 },
  ],
}

// 正解の 2 本を、画面の px で描いた線（縦 x=300、横 y=300）
const vertical = { a: { x: 300, y: 0 }, b: { x: 300, y: 600 } }
const horizontal = { a: { x: 0, y: 300 }, b: { x: 600, y: 300 } }

describe('描いた線を mm に直す（仕様 1〜2）', () => {
  it('300 px は 3000 mm。長さ 200 mm 以上の線は残す', () => {
    const lines = drawnLinesFromPx([{ a: { x: 0, y: 0 }, b: { x: 300, y: 0 } }], 10)
    expect(lines).toEqual([{ a: { x: 0, y: 0 }, b: { x: 3000, y: 0 } }])
  })

  it('10 px（100 mm）の線は捨てる', () => {
    expect(drawnLinesFromPx([{ a: { x: 0, y: 0 }, b: { x: 10, y: 0 } }], 10)).toEqual([])
  })
})

describe('照合の記録（仕様 3）', () => {
  it('正解の 2 本をそのまま描くと、再現率も適合率も 1', () => {
    const r = scoreDrawing(grid2x2, [vertical, horizontal], 600)
    expect(r).toEqual({ caseId: '田の字-01', tolMm: 50, truthCount: 2, drawnCount: 2, recall: 1, precision: 1 })
  })

  it('2 px（20 mm）ずれて描いても一致（許容差 50 mm 以内）', () => {
    const shifted = { a: { x: 302, y: 0 }, b: { x: 302, y: 600 } }
    expect(scoreDrawing(grid2x2, [shifted, horizontal], 600).recall).toBe(1)
  })

  it('横の 1 本だけ描くと、再現率 0.5', () => {
    expect(scoreDrawing(grid2x2, [horizontal], 600).recall).toBe(0.5)
  })
})

describe('同じ入力（仕様 4）', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const strokes = [vertical]
    const before = JSON.stringify(strokes)
    expect(scoreDrawing(grid2x2, strokes, 600)).toEqual(scoreDrawing(grid2x2, strokes, 600))
    expect(JSON.stringify(strokes)).toBe(before)
  })
})
