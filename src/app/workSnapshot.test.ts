// 仕様（ハブ A-03 G68・D-04 作業履歴。行からその時点に戻す。仮置き）:
// 仕様 1: 状態（線・階数・階高・什器）を文字列にし、同じ内容に戻せる。
// 仕様 2: 壊れた文字列や形の違う状態は、戻さずに例外にする。
// 仕様 3: 線が変わった行は、その時点の線の本数を目標に書き、状態を付ける。
// 仕様 4: 状態を戻すと、画面の状態（線・階数・階高・什器）がその時点のものになる。案件名は今の名前のまま。
import { beforeEach, describe, expect, it } from 'vitest'
import { lineChangeEntry, parseSnapshot, restoreSnapshotJson, snapshotJson } from './workSnapshot'
import { useDrawing } from '../store/drawing'
import { useFixtures } from '../store/fixtures'

const entry = {
  stroke: {
    id: 'stroke-1',
    points: [
      { px: 0, py: 0 },
      { px: 100, py: 0 },
    ],
    view_scale: 10,
    view_origin: { px: 0, py: 0 },
    stage: 'F4' as const,
    pen_mode: 'line' as const,
    created_at: '2026-11-04T01:00:00.000Z',
    pen_input: 'mouse' as const,
  },
  segments: [
    {
      id: 'seg-1',
      x1: 0,
      y1: 0,
      x2: 1000,
      y2: 0,
      start_node_id: 'n1',
      end_node_id: 'n2',
      snap: 'none' as const,
      stage: 'F4' as const,
      revision: 0,
      curve: 'line' as const,
    },
  ],
  nodes: [
    { id: 'n1', x: 0, y: 0 },
    { id: 'n2', x: 1000, y: 0 },
  ],
}

const state = {
  entries: [entry],
  storeyCount: 4,
  storeyHeightMm: 3100,
  fixtures: [{ id: 'fixture-1', item: 'toilet' as const, unitId: null }],
}

describe('状態の文字列（仕様 1・2）', () => {
  it('文字列にして戻すと、線・階数・階高・什器が同じ内容に戻る', () => {
    const back = parseSnapshot(snapshotJson(state))
    expect(back.entries).toEqual([entry])
    expect(back.storeyCount).toBe(4)
    expect(back.storeyHeightMm).toBe(3100)
    expect(back.fixtures).toEqual(state.fixtures)
  })

  it('壊れた文字列や形の違う状態は、例外にする', () => {
    expect(() => parseSnapshot('not json')).toThrow()
    expect(() => parseSnapshot('{}')).toThrow()
  })
})

describe('線の変更の行（仕様 3）', () => {
  it('線の本数を目標に書き、状態を付ける', () => {
    const e = lineChangeEntry(state, '2026-11-04T02:00:00.000Z')
    expect(e.target).toBe('線 1 本')
    expect(e.screen).toBe('P2')
    expect(parseSnapshot(e.snapshot).entries).toEqual([entry])
  })
})

describe('状態に戻す（仕様 4）', () => {
  beforeEach(() => {
    useDrawing.setState({ entries: [], past: [], redoStack: [], storeyCount: 2, storeyHeightMm: 2800, fitted: false })
    useFixtures.setState({ fixtures: [] })
  })

  it('線・階数・階高・什器がその時点のものになり、案件名は今の名前のまま', () => {
    restoreSnapshotJson(snapshotJson(state), '敷地A')
    const d = useDrawing.getState()
    expect(d.entries).toEqual([entry])
    expect(d.storeyCount).toBe(4)
    expect(d.storeyHeightMm).toBe(3100)
    expect(useFixtures.getState().fixtures).toEqual(state.fixtures)
  })
})
