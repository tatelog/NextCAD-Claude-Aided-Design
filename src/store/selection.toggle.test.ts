// 仕様（代表の決定 G159）: タップで線を選ぶ。もう一度タップで外れる。複数選べる（選んだ順）。
// 仕様 1（トグル）: 選んでいない線は末尾に入り、選んでいる線は外れる。ほかの線の並びは変わらない。
import { beforeEach, describe, expect, it } from 'vitest'
import { useSelection } from './selection'

beforeEach(() => useSelection.getState().clearSelection())

describe('線の選択のトグル（仕様 1）', () => {
  it('選んでいない線は末尾に入る（選んだ順）', () => {
    useSelection.getState().toggleSegment('a')
    useSelection.getState().toggleSegment('b')
    expect(useSelection.getState().segmentIds).toEqual(['a', 'b'])
  })

  it('もう一度選ぶと外れ、ほかの線の並びは変わらない', () => {
    useSelection.getState().setSegmentIds(['a', 'b', 'c'])
    useSelection.getState().toggleSegment('b')
    expect(useSelection.getState().segmentIds).toEqual(['a', 'c'])
  })
})
