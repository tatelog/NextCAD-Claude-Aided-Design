// 仕様（ハブ A-03 G142・統括の依頼 2026-11-05、t55 の残り）: 選んでいる線をチャットの文脈に渡す（「選んだものの周辺」）。
// 仕様 1（初期）: 最初は選んでいる線が無い。
// 仕様 2（置く・外す）: 選んだ線の id を置き、外せる。
// 仕様 3（重複）: 同じ id は一度だけ、並びは選んだ順。
// 仕様 4（文脈）: 選んでいる線は、チャットの文脈の「選んだ周辺」に出る。
// 注: 選ぶ操作の画面（UI）はまだ無い。UI の挙動は代表の確認が要るので、ここでは作らない。
import { beforeEach, describe, expect, it } from 'vitest'
import { useSelection } from './selection'
import { buildChatContext } from '../chat/chatContext'
import { contextInputOf } from '../chat/chatTransport'

beforeEach(() => {
  useSelection.getState().clearSelection()
})

describe('選んでいる線（仕様 1・2・3）', () => {
  it('最初は選んでいる線が無い', () => {
    expect(useSelection.getState().segmentIds).toEqual([])
  })

  it('選んだ線の id を置き、外せる', () => {
    useSelection.getState().setSegmentIds(['s1', 's2'])
    expect(useSelection.getState().segmentIds).toEqual(['s1', 's2'])
    useSelection.getState().clearSelection()
    expect(useSelection.getState().segmentIds).toEqual([])
  })

  it('同じ id は一度だけ。並びは選んだ順', () => {
    useSelection.getState().setSegmentIds(['s2', 's1', 's2'])
    expect(useSelection.getState().segmentIds).toEqual(['s2', 's1'])
  })
})

describe('チャットの文脈に渡る（仕様 4）', () => {
  it('選んでいる線は、文脈の「選んだ周辺」に出る', () => {
    useSelection.getState().setSegmentIds(['s1'])
    const input = contextInputOf({
      screen: 'P2',
      mode: 'chat',
      rows: [],
      entries: [{ segments: [{ id: 's1' }, { id: 's2' }] }],
      assignments: { s1: { kind: 'wall' } },
      selectedSegmentIds: useSelection.getState().segmentIds,
    })
    expect(input.selectedSegmentIds).toEqual(['s1'])
    const blocks = buildChatContext(input)
    expect(blocks[2]).toContain('線 s1')
    expect(blocks[2]).not.toContain('線 s2')
  })
})
