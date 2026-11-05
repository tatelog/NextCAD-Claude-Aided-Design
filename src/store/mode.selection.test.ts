// 仕様（代表の決定 G159。統括の依頼で「モードを切り替えたら選択を外すか」は作りやすい方で決めてよい）:
// 仕様 4（モードを切り替えたら外す）: モードを変えると、選んでいた線は外れる（チャットの文脈に、前のモードの選択が残らない）。
import { beforeEach, describe, expect, it } from 'vitest'
import { useMode } from './mode'
import { useSelection } from './selection'

beforeEach(() => {
  useSelection.getState().clearSelection()
  useMode.setState({ mode: 'system' })
})

describe('モードを切り替えたときの選択（仕様 4）', () => {
  it('チャットから Drawing に切り替えると、選んでいた線は外れる', () => {
    useMode.getState().setMode('chat')
    useSelection.getState().setSegmentIds(['a', 'b'])
    useMode.getState().setMode('drawing')
    expect(useSelection.getState().segmentIds).toEqual([])
  })

  it('モードを変えないときは、選択は残る', () => {
    useSelection.getState().setSegmentIds(['a'])
    useMode.getState().setMode('system')
    expect(useSelection.getState().segmentIds).toEqual(['a'])
  })
})
