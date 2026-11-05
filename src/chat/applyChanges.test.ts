// 仕様（ハブ A-03 G97・G14。統括の依頼 t55）: Claude が図面を変えたら、その場で反映し、変更の前の状態を返す（Undo で戻す）。
// 仕様 1（反映）: 階数・階高・線の種類の変更は、その場で図面の店舗に入る。
// 仕様 2（戻す）: 変更の前の状態を返し、それを戻すと、変更の前の図面に戻る。
// 仕様 3（無い線）: 図面に無い線の種類の変更は入らず、スキップとして返す（黙って消さない）。
// 仕様 4（説明）: 変更の説明は人が読める文（右側でまとめて確認する。G14）。
import { beforeEach, describe, expect, it } from 'vitest'
import { useDrawing } from '../store/drawing'
import { useSemantic } from '../store/semantic'
import { applyChangeBatch, describeChange, restoreSnapshot, snapshotOfState } from './applyChanges'
import { PRICE_CSV_SAMPLE } from '../store/priceTable'

// 図面は線の id（s1）だけを持つ最小の形（種類の変更の確かめに使う）
const drawingWithS1 = [{ id: 'e1', segments: [{ id: 's1' }] }] as unknown as ReturnType<typeof useDrawing.getState>['entries']

beforeEach(() => {
  useDrawing.setState({ entries: drawingWithS1, storeyCount: 3, storeyHeightMm: 3000 })
  useSemantic.setState({ assignments: {} })
})

describe('反映（仕様 1）', () => {
  it('階数・階高・線の種類の変更は、その場で図面に入る', () => {
    applyChangeBatch([
      { op: 'setStoreyCount', count: 5 },
      { op: 'setStoreyHeight', mm: 3300 },
      { op: 'setKind', segmentId: 's1', kind: 'wall' },
    ])
    expect(useDrawing.getState()).toMatchObject({ storeyCount: 5, storeyHeightMm: 3300 })
    expect(useSemantic.getState().assignments['s1']).toMatchObject({ kind: 'wall', status: 'confirmed', by: 'human' })
  })
})

describe('戻す（仕様 2）', () => {
  it('変更の前の状態を返し、それを戻すと、変更の前の図面に戻る', () => {
    const { before } = applyChangeBatch([
      { op: 'setStoreyCount', count: 5 },
      { op: 'setKind', segmentId: 's1', kind: 'wall' },
    ])
    restoreSnapshot(before)
    expect(useDrawing.getState()).toMatchObject({ storeyCount: 3, storeyHeightMm: 3000 })
    expect(useSemantic.getState().assignments).toEqual({})
  })

  it('snapshotOfState は、いまの図面の状態をそのまま返す', () => {
    // 仕様の変更（t55・G143）: 図面の状態に、線（entries）も含める（一指示＝一 Undo で線も戻すため）
    // 仕様の変更（t55・G143）: 単価表（CSV）も含める（積算の操作も一指示＝一 Undo で戻すため）
    expect(snapshotOfState()).toEqual({ storeyCount: 3, storeyHeightMm: 3000, assignments: {}, entries: drawingWithS1, csv: PRICE_CSV_SAMPLE })
  })
})

describe('無い線（仕様 3）', () => {
  it('図面に無い線の種類の変更は入らず、スキップとして返す', () => {
    const { skipped, summary } = applyChangeBatch([{ op: 'setKind', segmentId: 'nope', kind: 'beam' }])
    expect(useSemantic.getState().assignments).toEqual({})
    expect(skipped).toEqual(['線 nope の種類を 梁 にする'])
    expect(summary).toEqual([])
  })
})

describe('説明（仕様 4）', () => {
  it('変更の説明は人が読める文になる', () => {
    expect(describeChange({ op: 'setStoreyCount', count: 5 })).toBe('階数を 5 にする')
    expect(describeChange({ op: 'setStoreyHeight', mm: 3000 })).toBe('階高を 3000 mm にする')
    expect(describeChange({ op: 'setKind', segmentId: 's1', kind: 'wall' })).toBe('線 s1 の種類を 壁 にする')
  })
})
