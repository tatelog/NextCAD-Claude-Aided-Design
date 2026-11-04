// 仕様: D-04 共通部品「ペンのモード」（G52: 道具の置き場は上・左・独立。サークルメニュー）、
// 「グリッドとスナップの切替」（D-02 C1: 表示グリッドと入力スナップは別設定）、G8・G6（直線／曲線）。
import { beforeEach, describe, expect, it } from 'vitest'
import { useUi } from './ui'

describe('道具の置き場（G52）', () => {
  beforeEach(() => useUi.setState(useUi.getInitialState(), true))

  it('既定は上（ヘッダー）', () => {
    expect(useUi.getState().toolbarPlacement).toBe('top')
  })

  it.each(['top', 'left', 'free'] as const)('置き場を %s に切り替えられる', (placement) => {
    useUi.getState().setToolbarPlacement(placement)
    expect(useUi.getState().toolbarPlacement).toBe(placement)
  })

  it('独立（free）のときの位置は置き場の切替と別に覚える', () => {
    useUi.getState().setFreePosition({ x: 300, y: 200 })
    useUi.getState().setToolbarPlacement('left')
    useUi.getState().setToolbarPlacement('free')
    expect(useUi.getState().freePosition).toEqual({ x: 300, y: 200 })
  })
})

describe('サークルメニュー（G52）', () => {
  beforeEach(() => useUi.setState(useUi.getInitialState(), true))

  it('既定では開いていない', () => {
    expect(useUi.getState().circleMenu).toBeNull()
  })

  it('右クリック（または連続タップ）で、その位置に開く', () => {
    useUi.getState().openCircleMenu({ x: 420, y: 310 })
    expect(useUi.getState().circleMenu).toEqual({ x: 420, y: 310 })
  })

  it('閉じると null に戻る', () => {
    useUi.getState().openCircleMenu({ x: 1, y: 2 })
    useUi.getState().closeCircleMenu()
    expect(useUi.getState().circleMenu).toBeNull()
  })

  it('サークルメニューを開いても、道具の置き場は変わらない', () => {
    useUi.getState().setToolbarPlacement('left')
    useUi.getState().openCircleMenu({ x: 1, y: 2 })
    expect(useUi.getState().toolbarPlacement).toBe('left')
  })
})

describe('表示グリッドと入力スナップは別設定（D-02 C1）', () => {
  beforeEach(() => useUi.setState(useUi.getInitialState(), true))

  it('表示グリッドを切っても、入力スナップは変わらない', () => {
    const before = useUi.getState().inputSnapGrid
    useUi.getState().setDisplayGrid(false)
    expect(useUi.getState().inputSnapGrid).toBe(before)
  })

  it('入力スナップを切っても、表示グリッドは変わらない', () => {
    useUi.getState().setDisplayGrid(true)
    useUi.getState().setInputSnapGrid(false)
    expect(useUi.getState().displayGrid).toBe(true)
    expect(useUi.getState().inputSnapGrid).toBe(false)
  })
})

describe('ペンのモード（G6）', () => {
  beforeEach(() => useUi.setState(useUi.getInitialState(), true))

  it('既定は直線', () => {
    expect(useUi.getState().penMode).toBe('line')
  })

  it('直線と曲線を切り替えられ、置き場は変わらない', () => {
    useUi.getState().setToolbarPlacement('left')
    useUi.getState().setPenMode('curve')
    expect(useUi.getState().penMode).toBe('curve')
    expect(useUi.getState().toolbarPlacement).toBe('left')
  })
})
