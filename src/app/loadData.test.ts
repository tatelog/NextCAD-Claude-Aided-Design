// 仕様: 保存したデータ（buildSaveData の JSON）を読み込み、画面の状態に戻せる形にする。
// 仕様 1: 保存して読むと、案件名・保存日時・線の一覧・階数・階高・什器が元に戻る（往復）。
// 仕様 2: 什器の項目が無い古い保存は、什器が空の一覧として読める。
// 仕様 3: 階数は 1〜30、階高は正の整数 mm。線の座標は整数 mm。品目は既知の 5 つ。保存日時は日時の形。
// 仕様 4: 形が合わないデータは、読まずにエラーにする（画面の状態は変わらない）。
import { describe, expect, it } from 'vitest'
import { parseSaveData } from './loadData'
import { buildSaveData } from './saveData'

// 1 本の線（2 点・2 端点）。保存の中身はこの形の一覧
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

// JSON にしてから読む（ファイルに書いて読み直す、と同じ経路）
const roundTrip = (input: Parameters<typeof buildSaveData>[0]): unknown => JSON.parse(JSON.stringify(buildSaveData(input)))

describe('parseSaveData（保存したデータを読む）', () => {
  it('保存して読むと、案件名・保存日時・線・階数・階高・什器が元に戻る', () => {
    const json = roundTrip({
      projectName: '敷地A',
      entries: [entry],
      storeyCount: 6,
      storeyHeightMm: 3200,
      fixtures: [{ id: 'fixture-1', item: 'kitchen', unitId: 'U1' }],
      savedAt: new Date('2026-11-04T01:02:03.000Z'),
    })
    const loaded = parseSaveData(json)
    expect(loaded.projectName).toBe('敷地A')
    expect(loaded.savedAt).toEqual(new Date('2026-11-04T01:02:03.000Z'))
    expect(loaded.entries).toEqual([entry])
    expect(loaded.storeyCount).toBe(6)
    expect(loaded.storeyHeightMm).toBe(3200)
    expect(loaded.fixtures).toEqual([{ id: 'fixture-1', item: 'kitchen', unitId: 'U1' }])
  })

  it('什器の項目が無い古い保存は、什器が空の一覧として読める', () => {
    const json = roundTrip({ projectName: '古い', entries: [], storeyCount: 5, storeyHeightMm: 3000, savedAt: new Date('2026-11-01T00:00:00.000Z') })
    expect(parseSaveData(json).fixtures).toEqual([])
  })

  it('階数 0 と 31 は、エラーにする（階数は 1〜30）', () => {
    const base = roundTrip({ projectName: 'x', entries: [], storeyCount: 5, storeyHeightMm: 3000, savedAt: new Date('2026-11-01T00:00:00.000Z') })
    expect(() => parseSaveData({ ...(base as object), storeyCount: 0 })).toThrow()
    expect(() => parseSaveData({ ...(base as object), storeyCount: 31 })).toThrow()
  })

  it('階高が 0 以下や小数なら、エラーにする', () => {
    const base = roundTrip({ projectName: 'x', entries: [], storeyCount: 5, storeyHeightMm: 3000, savedAt: new Date('2026-11-01T00:00:00.000Z') })
    expect(() => parseSaveData({ ...(base as object), storeyHeightMm: 0 })).toThrow()
    expect(() => parseSaveData({ ...(base as object), storeyHeightMm: 3000.5 })).toThrow()
  })

  it('保存日時が日時の形でなければ、エラーにする', () => {
    const base = roundTrip({ projectName: 'x', entries: [], storeyCount: 5, storeyHeightMm: 3000, savedAt: new Date('2026-11-01T00:00:00.000Z') })
    expect(() => parseSaveData({ ...(base as object), savedAt: 'きのう' })).toThrow()
  })

  it('線の座標が整数 mm でなければ、エラーにする', () => {
    const bad = { ...entry, segments: [{ ...entry.segments[0]!, x2: 1000.5 }] }
    const json = roundTrip({ projectName: 'x', entries: [bad], storeyCount: 5, storeyHeightMm: 3000, savedAt: new Date('2026-11-01T00:00:00.000Z') })
    expect(() => parseSaveData(json)).toThrow()
  })

  it('品目が既知の 5 つにない什器は、エラーにする', () => {
    // 型の上では作れない品目なので、JSON の形で直接書く（保存の画面からは来ないデータ）
    const base = roundTrip({ projectName: 'x', entries: [], storeyCount: 5, storeyHeightMm: 3000, savedAt: new Date('2026-11-01T00:00:00.000Z') })
    expect(() => parseSaveData({ ...(base as object), fixtures: [{ id: 'fixture-1', item: 'bath', unitId: null }] })).toThrow()
  })

  it('オブジェクトでないもの・線が一覧でないものは、エラーにする', () => {
    expect(() => parseSaveData(null)).toThrow()
    expect(() => parseSaveData('{}')).toThrow()
    const base = roundTrip({ projectName: 'x', entries: [], storeyCount: 5, storeyHeightMm: 3000, savedAt: new Date('2026-11-01T00:00:00.000Z') })
    expect(() => parseSaveData({ ...(base as object), entries: 'abc' })).toThrow()
  })
})
