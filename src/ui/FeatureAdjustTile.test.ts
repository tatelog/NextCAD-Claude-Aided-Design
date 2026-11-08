// 仕様（ハブ A-03 G43・G70・G95。統括の依頼 t55）: 描画のモードの右パネルの項目「機能の調整（G43）」は、機能一覧を SVG のチェックの行で出す。
// 仕様 1: 機能の行は、機能の一覧の数（14）だけ出る。各行の右側に SVG のチェック。
// 仕様 2: チェックは、その機能の今の状態（featureShown）と同じ。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FEATURE_ITEMS } from '../store/features'
import { FeatureAdjustTile } from './FeatureAdjustTile'

describe('機能の調整（仕様 1）', () => {
  it('機能の行は、機能の一覧の数（14）だけ、各行に SVG のチェックを出す', () => {
    const html = renderToStaticMarkup(createElement(FeatureAdjustTile, { screen: 'P3' }))
    expect((html.match(/<svg/g) ?? []).length).toBe(FEATURE_ITEMS.length)
    expect(html).toContain('表示')
    expect(html).toContain('操作')
    expect(html).toContain('計算')
  })
})
