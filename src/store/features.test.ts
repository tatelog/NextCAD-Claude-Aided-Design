// 仕様（ハブ A-03 G70、D-04 共通部品「機能のオンオフ」）: 機能を個別にオンオフできる設定を持つ。
// 項目の中身は画面側の案（ハブ G70 の案。未決）。案のまま仮置き。
// 仕様 1: 項目は 14 個。表示 5（日影・周辺建物・寸法線・グリッド・全体図）、操作 6（回転表示・回転操作・入力スナップ・端点の輪・サークルメニュー・つまみ）、計算 3（意味づけ Claude・斜線・日影の再計算・自動保存）。
// 仕様 2: 既定はすべて入（オン）。
// 仕様 3: 1 項目を切り替えても、ほかの項目は変わらない。
// 仕様 4: 振る舞いにつながっている項目（connected）と、まだつながっていない項目（未接続）が分かる。今つながっているのは 6 個（表示 5 と入力スナップ）。
// 仕様 5: つながっている項目を切り替えると、対応する画面の状態の変更が出る。つながっていない項目は、変更を出さない（null）。
import { beforeEach, describe, expect, it } from 'vitest'
import { FEATURE_ITEMS, featureUiPatch, useFeatures, type FeatureGroup } from './features'

describe('機能の一覧（仕様 1・4）', () => {
  it('14 個あり、表示 5・操作 6・計算 3 に分かれる', () => {
    expect(FEATURE_ITEMS).toHaveLength(14)
    const count = (g: FeatureGroup) => FEATURE_ITEMS.filter((i) => i.group === g).length
    expect(count('表示')).toBe(5)
    expect(count('操作')).toBe(6)
    expect(count('計算')).toBe(3)
  })

  it('つながっている項目は 6 個（表示 5 と入力スナップ）', () => {
    const connected = FEATURE_ITEMS.filter((i) => i.connected).map((i) => i.key)
    expect(connected.sort()).toEqual(['inputSnap', 'showDimensions', 'showGrid', 'showMiniMap', 'showNeighbors', 'showShadow'].sort())
  })
})

describe('機能のオンオフの状態（仕様 2・3）', () => {
  beforeEach(() => {
    useFeatures.getState().reset()
  })

  it('既定はすべて入', () => {
    const on = useFeatures.getState().on
    for (const item of FEATURE_ITEMS) expect(on[item.key], item.key).toBe(true)
  })

  it('1 項目を切り替えても、ほかは変わらない', () => {
    useFeatures.getState().setOn('endpointRing', false)
    const on = useFeatures.getState().on
    expect(on.endpointRing).toBe(false)
    for (const item of FEATURE_ITEMS.filter((i) => i.key !== 'endpointRing')) expect(on[item.key], item.key).toBe(true)
  })
})

describe('つながっている項目の画面への反映（仕様 5）', () => {
  it('表示の項目は、対応する表示の状態を変える', () => {
    expect(featureUiPatch('showShadow', false)).toEqual({ showShadow: false })
    expect(featureUiPatch('showMiniMap', true)).toEqual({ showMiniMap: true })
  })

  it('入力スナップは、入力のグリッドのスナップを変える', () => {
    expect(featureUiPatch('inputSnap', false)).toEqual({ inputSnapGrid: false })
  })

  it('つながっていない項目は、変更を出さない（null）', () => {
    expect(featureUiPatch('endpointRing', false)).toBeNull()
    expect(featureUiPatch('autoSave', true)).toBeNull()
  })
})
