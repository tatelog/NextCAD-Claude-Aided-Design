// 仕様（統括の依頼 2026-11-06。7: 開発用の道具は、☰ メニューの切替で出す。既定は隠す）:
// 仕様 7-1: 最初は隠れている（shown=false）。
// 仕様 7-2: 切替で出し、もう一度切り替えると隠れる。
import { beforeEach, describe, expect, it } from 'vitest'
import { useDevTools } from './devTools'

beforeEach(() => useDevTools.setState({ shown: false }))

describe('開発用の道具の表示（仕様 7-1・7-2）', () => {
  it('仕様 7-1: 最初は隠れている', () => {
    expect(useDevTools.getInitialState().shown).toBe(false)
  })

  it('仕様 7-2: 切替で出し、もう一度切り替えると隠れる', () => {
    useDevTools.getState().setShown(true)
    expect(useDevTools.getState().shown).toBe(true)
    useDevTools.getState().setShown(false)
    expect(useDevTools.getState().shown).toBe(false)
  })
})
