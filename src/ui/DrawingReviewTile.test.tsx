// 仕様（ハブ A-03 G124「間に合わせる」。設計グリル 2026-11-05。Drawing の右メニューの候補の確認欄）:
// 仕様 1（欄）: 候補の確認欄は、意味づけの確認と同じ部品（SemanticConfirm）で出す。見出しは「オブジェクト判定（Drawing）」。
// 仕様 2（空）: 描いた線（F5・F9）がまだ無いときは、空の案内を出す。
// 仕様 3（件数）: 未分類・要確認・確定の件数の欄を出す。
// 判定（Claude）は未接続（t15）。欄は人が種類を選ぶ。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DrawingReviewTile } from './DrawingReviewTile'
import { useSemantic } from '../store/semantic'

// 描画（react-dom/server）では zustand が初期の状態を返すので、店舗は今の状態を読む形に差し替える（P3ToolbarPlacement.test.ts と同じ理由）
vi.mock('../store/semantic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/semantic')>()
  const live = <T,>(selector: (s: ReturnType<typeof actual.useSemantic.getState>) => T): T => selector(actual.useSemantic.getState())
  return { ...actual, useSemantic: Object.assign(live, actual.useSemantic) }
})

describe('候補の確認欄（G124）', () => {
  // 判定の一回分を戻す（仕様 4。G14・G97）: 戻せるときだけボタンを出す
  it('仕様 4: 直前の判定が戻せるときは「判定を戻す」を出し、無いときは出さない', () => {
    useSemantic.setState({ judgementUndo: null })
    expect(renderToStaticMarkup(createElement(DrawingReviewTile))).not.toContain('判定を戻す')
    useSemantic.setState({ judgementUndo: { changed: [] } })
    expect(renderToStaticMarkup(createElement(DrawingReviewTile))).toContain('判定を戻す')
    useSemantic.setState({ judgementUndo: null })
  })

  it('仕様 1: 見出しは「オブジェクト判定（Drawing）」で、意味づけの確認と同じ欄の形（fieldset）', () => {
    const html = renderToStaticMarkup(createElement(DrawingReviewTile))
    expect(html).toContain('<fieldset')
    expect(html).toContain('オブジェクト判定（Drawing）')
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
