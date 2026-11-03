// 仕様（ハブ D-04 レイヤー「各レイヤーに表示／非表示とロック」）: ロックしたレイヤーの線は動かせない。
// 仕様 1: 動く線のうち、ロックしたレイヤーに入るものがあれば、変形は全体を取り消す（何も変えない。取り消しの履歴も増えない）。
// 仕様 2: ロックしていなければ、ふつうに変形する。
// 仕様 3: ロックしていないレイヤーの線だけが動くなら、ほかのレイヤーがロックされていても変形する。
import { beforeEach, describe, expect, it } from 'vitest'
import { useDrawing, type DrawingState } from './drawing'
import { useSemantic } from './semantic'
import { useLayers } from './layers'

// 店舗の一筆（変形の引数と同じ型）
type Entry = Parameters<Parameters<DrawingState['transform']>[0]>[0][number]

// 線 1 本（F9 の間取りの線）を持つ一筆
const entryOf = (stage: 'F4' | 'F5' | 'F9'): Entry => ({
  stroke: {
    id: `st-${stage}`,
    points: [
      { px: 0, py: 0 },
      { px: 100, py: 0 },
    ],
    view_scale: 10,
    view_origin: { px: 0, py: 0 },
    stage,
    pen_mode: 'line' as 'line' | 'curve',
    created_at: '2026-11-04T01:00:00.000Z',
    pen_input: 'mouse' as const,
  },
  segments: [
    { id: `seg-${stage}`, x1: 0, y1: 0, x2: 1000, y2: 0, start_node_id: 'n1', end_node_id: 'n2', snap: 'none' as const, stage, revision: 0, curve: 'line' as const },
  ],
  nodes: [
    { id: 'n1', x: 0, y: 0 },
    { id: 'n2', x: 1000, y: 0 },
  ],
})

// 終点を 100 mm 伸ばす変形
const stretch = (es: Entry[]): Entry[] =>
  es.map((e) => ({ ...e, segments: e.segments.map((s) => ({ ...s, x2: s.x2 + 100, revision: s.revision + 1 })) }))

describe('ロックしたレイヤーの線は動かせない（仕様 1・2・3）', () => {
  beforeEach(() => {
    useDrawing.setState({ entries: [], past: [], redoStack: [], fitted: false })
    useSemantic.getState().clear()
    useLayers.getState().reset()
  })

  it('壁のレイヤーをロックしたら、壁の線を動かす変形は何も変えない（履歴も増えない）', () => {
    useDrawing.setState({ entries: [entryOf('F9')] })
    useSemantic.getState().setKind('seg-F9', 'wall')
    useLayers.getState().setLocked('壁', true)
    const before = useDrawing.getState().entries
    useDrawing.getState().transform(stretch)
    expect(useDrawing.getState().entries).toBe(before)
    expect(useDrawing.getState().past).toHaveLength(0)
  })

  it('ロックしていなければ、ふつうに変形する', () => {
    useDrawing.setState({ entries: [entryOf('F9')] })
    useSemantic.getState().setKind('seg-F9', 'wall')
    useDrawing.getState().transform(stretch)
    expect(useDrawing.getState().entries[0]!.segments[0]!.x2).toBe(1100)
  })

  it('動く線のレイヤーがロックされていなければ、ほかのレイヤーがロックされていても変形する', () => {
    useDrawing.setState({ entries: [entryOf('F9')] })
    useSemantic.getState().setKind('seg-F9', 'wall')
    useLayers.getState().setLocked('柱', true)
    useDrawing.getState().transform(stretch)
    expect(useDrawing.getState().entries[0]!.segments[0]!.x2).toBe(1100)
  })

  it('外形（F4）のレイヤーをロックしたら、外形の線は動かせない', () => {
    useDrawing.setState({ entries: [entryOf('F4')] })
    useLayers.getState().setLocked('外形', true)
    const before = useDrawing.getState().entries
    useDrawing.getState().transform(stretch)
    expect(useDrawing.getState().entries).toBe(before)
  })
})
