// 仕様（統括の依頼 2026-11-05「P3 の線を意味づけの確認欄の対象に入れる」。設計グリルの決定 G9・G14）:
// 意味づけの対象（確認欄と Claude の判定）は、段が F5・F9 の線。
// 仕様 1（P3 の線）: P3 で描いた線（段 F9）は、対象に入る。
// 仕様 2（外形）: P2 の外形の線（段 F4）は、対象に入らない（G9）。
// 仕様 3（P2 の F5・F9）: P2 の段 F5・F9 の線は、今までどおり対象に入る。
import { beforeEach, describe, expect, it } from 'vitest'
import { targetSegmentsOf } from './semanticConfirm'
import { useDrawing } from '../store/drawing'
import type { Stroke } from '../model/schema'

let seq = 0
const stroke = (points: [number, number][], stage: Stroke['stage']): Stroke => ({
  id: `st-target-${seq++}`,
  points: points.map(([px, py]) => ({ px, py })),
  view_scale: 10,
  view_origin: { px: 0, py: 0 },
  stage,
  pen_mode: 'line',
  created_at: '2026-11-05T00:00:00.000Z',
  pen_input: 'mouse',
})

beforeEach(() => useDrawing.setState({ entries: [], past: [], redoStack: [] }))

describe('意味づけの対象（仕様 1〜3）', () => {
  it('仕様 1: P3 で描いた線（段 F9）は対象に入る', () => {
    useDrawing.getState().addStroke(stroke([[100, 100], [300, 100]], 'F9'), null, 'P3')
    const got = targetSegmentsOf(useDrawing.getState().entries)
    expect(got).toHaveLength(1)
    expect(got[0]!.stage).toBe('F9')
  })

  it('仕様 2: P2 の外形（段 F4）は対象に入らない', () => {
    useDrawing.getState().addStroke(stroke([[0, 0], [400, 0]], 'F4'))
    expect(targetSegmentsOf(useDrawing.getState().entries)).toHaveLength(0)
  })

  it('仕様 3: P2 の段 F5 の線は、今までどおり対象に入る', () => {
    useDrawing.getState().addStroke(stroke([[0, 0], [400, 0]], 'F5'))
    expect(targetSegmentsOf(useDrawing.getState().entries)).toHaveLength(1)
  })
})
