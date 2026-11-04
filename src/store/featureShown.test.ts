// 仕様（ハブ A-03 G43・G70。統括の依頼 t55）: 機能の行のチェックは、その機能の今の状態を見る。
// 仕様 1（表示）: 表示の五つ（日影・周辺建物・寸法線・全体図・グリッド）は、画面の表示の状態を見る。
// 仕様 2（入力スナップ）: 入力スナップは、入力の状態を見る。
// 仕様 3（ほか）: 操作と計算は、機能のオンオフの設定を見る。
// 仕様 4（入れる・外す）: setFeatureOn は、設定を持ち、つながっている項目は画面の状態にも出す。
import { beforeEach, describe, expect, it } from 'vitest'
import { featureShown, setFeatureOn } from './features'
import { useFeatures } from './features'
import { useUi } from './ui'

beforeEach(() => {
  useFeatures.getState().reset()
  useUi.setState({ showShadow: true, showNeighbors: true, showDimensions: true, showGrid: true, showMiniMap: true, inputSnapGrid: false })
})

describe('チェックの状態（仕様 1〜3）', () => {
  it('表示の五つは、画面の表示の状態を見る', () => {
    useUi.setState({ showGrid: false })
    expect(featureShown('showGrid')).toBe(false)
    expect(featureShown('showShadow')).toBe(true)
  })

  it('入力スナップは、入力の状態を見る', () => {
    useUi.setState({ inputSnapGrid: true })
    expect(featureShown('inputSnap')).toBe(true)
  })

  it('操作と計算は、機能のオンオフの設定を見る', () => {
    useFeatures.getState().setOn('knobs', false)
    expect(featureShown('knobs')).toBe(false)
    expect(featureShown('classifyClaude')).toBe(true)
  })
})

describe('入れる・外す（仕様 4）', () => {
  it('setFeatureOn は、設定と、つながっている画面の状態を変える', () => {
    setFeatureOn('showDimensions', false)
    expect(useUi.getState().showDimensions).toBe(false)
    expect(featureShown('showDimensions')).toBe(false)
    setFeatureOn('knobs', false)
    expect(useFeatures.getState().on.knobs).toBe(false)
  })
})
