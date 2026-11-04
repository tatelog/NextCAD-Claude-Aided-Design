// 仕様（ハブ A-03 G124「間に合わせる」。設計グリル 2026-11-05。Drawing の右メニューの候補の確認欄）:
// 仕様 1（欄）: 候補の確認欄は、意味づけの確認と同じ部品（SemanticConfirm）で出す。見出しは「候補の確認（Drawing）」。
// 仕様 2（空）: 描いた線（F5・F9）がまだ無いときは、空の案内を出す。
// 仕様 3（件数）: 未分類・要確認・確定の件数の欄を出す。
// 判定（Claude）は未接続（t15）。欄は人が種類を選ぶ。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DrawingReviewTile } from './DrawingReviewTile'

describe('候補の確認欄（G124）', () => {
  it('仕様 1: 見出しは「候補の確認（Drawing）」で、意味づけの確認と同じ欄の形（fieldset）', () => {
    const html = renderToStaticMarkup(createElement(DrawingReviewTile))
    expect(html).toContain('<fieldset')
    expect(html).toContain('候補の確認（Drawing）')
    expect(html).not.toContain('意味づけの確認（G14）')
  })

  it('仕様 2: 描いた線（F5・F9）がまだ無いときは、空の案内を出す', () => {
    const html = renderToStaticMarkup(createElement(DrawingReviewTile))
    expect(html).toContain('対象の線（F5・F9）がまだありません')
  })

  it('仕様 3: 未分類・要確認・確定の件数の欄を出す', () => {
    const html = renderToStaticMarkup(createElement(DrawingReviewTile))
    expect(html).toContain('aria-label="意味づけの件数"')
  })
})
