// 仕様: D-02 C1「Undo / Redo」（仮置き: 1 ストローク・1 変形・1 意味付与を 1 単位、最大 100 件）、
// 「端点の共有」（仮置き: スナップ半径内の既存の端点に吸着したら ID を共有）、
// 「寸法の保持」（パン・ズームは描画だけ。線分の mm 座標は変えない）。
import { beforeEach, describe, expect, it } from 'vitest'
import { useDrawing } from './drawing'
import type { Stroke } from '../model/schema'

// 1 px = 50 mm。原点は画面の (0,0)
let seq = 0
const stroke = (points: [number, number][]): Stroke => ({
  id: `st-${seq++}`,
  points: points.map(([px, py]) => ({ px, py })),
  view_scale: 50,
  view_origin: { px: 0, py: 0 },
  stage: 'F5',
  pen_mode: 'line',
  created_at: '2026-11-03T00:00:00.000Z',
  pen_input: 'mouse',
})

const segmentsNow = () => useDrawing.getState().entries.flatMap((e) => e.segments)

describe('Undo / Redo: 1 ストローク・1 変形を 1 単位', () => {
  beforeEach(() => useDrawing.setState({ entries: [], past: [], redoStack: [], fitted: false }))

  it('1 本のストロークは、折れた線分が何本あっても Undo 1 回で全部消える', () => {
    useDrawing.getState().addStroke(stroke([[0, 0], [100, 0], [100, 100], [0, 100]]))
    expect(segmentsNow().length).toBeGreaterThan(1)
    useDrawing.getState().undo()
    expect(segmentsNow()).toHaveLength(0)
  })

  it('Redo で同じ線分が戻る', () => {
    useDrawing.getState().addStroke(stroke([[0, 0], [100, 0], [100, 100]]))
    const before = segmentsNow().map((s) => s.id)
    useDrawing.getState().undo()
    useDrawing.getState().redo()
    expect(segmentsNow().map((s) => s.id)).toEqual(before)
  })

  it('変形（transform）も 1 単位。Undo 1 回で元に戻る', () => {
    useDrawing.getState().addStroke(stroke([[0, 0], [100, 0]]))
    const orig = segmentsNow().map((s) => ({ x1: s.x1, x2: s.x2 }))
    useDrawing.getState().transform((entries) =>
      entries.map((e) => ({
        ...e,
        segments: e.segments.map((s) => ({ ...s, x1: s.x1 + 1000, x2: s.x2 + 1000 })),
      })),
    )
    expect(segmentsNow()[0]!.x1).toBe(orig[0]!.x1 + 1000)
    useDrawing.getState().undo()
    expect(segmentsNow().map((s) => ({ x1: s.x1, x2: s.x2 }))).toEqual(orig)
    // 変形を戻しても、前のストロークは残る（1 単位だけ戻した）
    expect(useDrawing.getState().entries).toHaveLength(1)
  })

  it('新しい操作をすると Redo の履歴は消える', () => {
    useDrawing.getState().addStroke(stroke([[0, 0], [100, 0]]))
    useDrawing.getState().undo()
    useDrawing.getState().addStroke(stroke([[500, 0], [600, 0]]))
    useDrawing.getState().redo()
    expect(useDrawing.getState().entries).toHaveLength(1)
  })

  it('履歴は最大 100 件。101 件目より前は戻せない（仮置き）', () => {
    // 1 本は 100 px（5000 mm）。吸着半径 24 px（1200 mm）より長くして、端点が戻らないようにする
    for (let i = 0; i < 105; i++) {
      const x = i * 300
      useDrawing.getState().addStroke(stroke([[x, 0], [x + 100, 0]]))
    }
    for (let i = 0; i < 100; i++) useDrawing.getState().undo()
    expect(useDrawing.getState().entries).toHaveLength(5)
    useDrawing.getState().undo()
    expect(useDrawing.getState().entries).toHaveLength(5)
  })

  it('パン・ズームは履歴に入らない（Undo でストロークは消えない）', () => {
    useDrawing.getState().addStroke(stroke([[0, 0], [100, 0]]))
    useDrawing.getState().setViewport({ originPx: { x: 10, y: 20 }, mmPerPx: 5 })
    useDrawing.getState().undo()
    expect(useDrawing.getState().entries).toHaveLength(0)
  })
})

describe('全部消す: Undo 1 回で戻せる（1 操作 = 1 単位）', () => {
  beforeEach(() => useDrawing.setState({ entries: [], past: [], redoStack: [], fitted: false }))

  it('全部消した後、Undo 1 回で線が全部戻る', () => {
    useDrawing.getState().addStroke(stroke([[0, 0], [100, 0]]))
    useDrawing.getState().addStroke(stroke([[300, 0], [400, 0]]))
    useDrawing.getState().clear()
    expect(useDrawing.getState().entries).toHaveLength(0)
    useDrawing.getState().undo()
    expect(useDrawing.getState().entries).toHaveLength(2)
  })
})

describe('表示の初期配置は一度だけ（再マウントで位置を戻さない）', () => {
  beforeEach(() => useDrawing.setState({ entries: [], past: [], redoStack: [], fitted: false }))

  it('fitViewport は最初の一回だけ効き、以後は今の表示を保つ', () => {
    const first = { originPx: { x: 1, y: 2 }, mmPerPx: 10 }
    const panned = { originPx: { x: 300, y: 400 }, mmPerPx: 4 }
    useDrawing.getState().fitViewport(first)
    useDrawing.getState().setViewport(panned)
    useDrawing.getState().fitViewport({ originPx: { x: 9, y: 9 }, mmPerPx: 99 })
    expect(useDrawing.getState().viewport).toEqual(panned)
  })
})

describe('寸法の保持: ズームしても既存の線分の mm は変わらない', () => {
  beforeEach(() => useDrawing.setState({ entries: [], past: [], redoStack: [], fitted: false }))

  it('表示の変換を変えても、線分の座標（mm）は同じ', () => {
    useDrawing.getState().addStroke(stroke([[0, 0], [100, 40]]))
    const before = segmentsNow().map((s) => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 }))
    useDrawing.getState().setViewport({ originPx: { x: 900, y: -300 }, mmPerPx: 0.25 })
    useDrawing.getState().setViewport({ originPx: { x: 5, y: 5 }, mmPerPx: 80 })
    expect(segmentsNow().map((s) => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 }))).toEqual(before)
  })
})

describe('端点の共有: 吸着は 24 px（仮置き）', () => {
  beforeEach(() => useDrawing.setState({ entries: [], past: [], redoStack: [], fitted: false }))

  it('24 px 以内で始まるストロークは既存の端点を共有する', () => {
    useDrawing.getState().addStroke(stroke([[0, 0], [200, 0]])) // 端点は (10000, 0) mm
    const endNode = segmentsNow()[0]!.end_node_id
    useDrawing.getState().addStroke(stroke([[220, 0], [220, 200]])) // 20 px 離れた所から始める
    expect(segmentsNow()[1]!.start_node_id).toBe(endNode)
  })

  it('24 px より遠いところから始めると、端点は共有しない', () => {
    useDrawing.getState().addStroke(stroke([[0, 0], [200, 0]]))
    const endNode = segmentsNow()[0]!.end_node_id
    useDrawing.getState().addStroke(stroke([[240, 0], [240, 200]])) // 40 px 離れる
    expect(segmentsNow()[1]!.start_node_id).not.toBe(endNode)
  })
})
