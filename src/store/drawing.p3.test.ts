// 仕様（統括の依頼 2026-11-05「P3 で描いた線を店舗に入れる」。G14・G97。P3Canvas.tsx の local state を是正）:
// 仕様 1（店舗に入る）: P3 で描いた線は、P2 と同じ店舗の線として入る（P3 の印つき）。
// 仕様 2（取り消し）: Undo で P3 の線も 1 単位で戻る。
// 仕様 3（画面ごと）: P2 の線の一覧に P3 の線は出ない。P3 の線の一覧に P2 の線は出ない（表示と閉合を分ける）。
// 仕様 4（吸着）: P3 の線は P3 の中の端点だけに吸着する。P2 の端点には吸着しない（今の P3 と同じ）。
import { beforeEach, describe, expect, it } from 'vitest'
import { p2Entries, p3Entries, useDrawing } from './drawing'
import type { Stroke } from '../model/schema'

let seq = 0
const stroke = (points: [number, number][]): Stroke => ({
  id: `st-p3-${seq++}`,
  points: points.map(([px, py]) => ({ px, py })),
  view_scale: 10,
  view_origin: { px: 0, py: 0 },
  stage: 'F4',
  pen_mode: 'line',
  created_at: '2026-11-05T00:00:00.000Z',
  pen_input: 'mouse',
})

beforeEach(() => useDrawing.setState({ entries: [], past: [], redoStack: [] }))

describe('P3 の線を店舗に入れる（仕様 1〜4）', () => {
  it('仕様 1: P3 の線は店舗の線として入る（P3 の印つき）', () => {
    useDrawing.getState().addStroke(stroke([[100, 100], [300, 100]]), null, 'P3')
    const entries = useDrawing.getState().entries
    expect(entries).toHaveLength(1)
    expect(entries[0]!.screen).toBe('P3')
    expect(entries[0]!.segments.length).toBeGreaterThan(0)
  })

  it('仕様 2: Undo で P3 の線も 1 単位で戻る', () => {
    useDrawing.getState().addStroke(stroke([[100, 100], [300, 100]]), null, 'P3')
    useDrawing.getState().undo()
    expect(useDrawing.getState().entries).toHaveLength(0)
  })

  it('仕様 3: P2 の線と P3 の線は一覧が分かれる', () => {
    useDrawing.getState().addStroke(stroke([[0, 0], [400, 0]]))
    useDrawing.getState().addStroke(stroke([[100, 100], [300, 100]]), null, 'P3')
    const all = useDrawing.getState().entries
    expect(p2Entries(all)).toHaveLength(1)
    expect(p2Entries(all)[0]!.screen).toBeUndefined()
    expect(p3Entries(all)).toHaveLength(1)
  })

  it('仕様 4: P3 の線は P2 の端点に吸着しない（P3 の線は両端とも新しい端点を作る）', () => {
    useDrawing.getState().addStroke(stroke([[0, 0], [400, 0]]))
    // P2 の端点 (0, 0) の近く（240 mm 以内）から始める。吸着するなら、始点は P2 の端点を共有する
    useDrawing.getState().addStroke(stroke([[5, 5], [300, 300]]), null, 'P3')
    const p3 = p3Entries(useDrawing.getState().entries)[0]!
    expect(p3.nodes).toHaveLength(2)
  })
})
