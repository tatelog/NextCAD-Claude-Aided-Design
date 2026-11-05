// 仕様（統括の指示 2026-11-06。代表「勝手に対象から外さないで。要確認項目と同じ扱い」）:
// 仕様 1: 案件の「はい・いいえ」の項目（日影規制区域内・構造計算・代理者・BIM・認定部材・建築設備・昇降機の 7 つ）は、
//         「未入力」「はい」「いいえ」から選ぶ。既定は「未入力」。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PermitProject } from '../law/permitInput'
import { usePermitProject } from '../store/permitProject'
import { PermitProjectFields } from './PermitProjectFields'

const render = (project: PermitProject) => renderToStaticMarkup(createElement(PermitProjectFields, { project, onChange: () => undefined }))

// 描画の結果から、選ばれている選択肢の文字を取り出す
const selectedOf = (html: string) => [...html.matchAll(/<option[^>]*selected[^>]*>([^<]*)<\/option>/g)].map((m) => m[1])

describe('案件の項目の欄（統括の指示 2026-11-06）', () => {
  it('仕様 1: 既定の案件では、はい・いいえの 7 項目がすべて「未入力」', () => {
    const html = render(usePermitProject.getState().project)
    expect(selectedOf(html).filter((t) => t === '未入力')).toHaveLength(7)
  })

  it('仕様 1: はい・いいえを選んだ項目は、その値が選ばれている（ほかは未入力のまま）', () => {
    const html = render({ ...usePermitProject.getState().project, hasElevator: true, hasAgent: false })
    const selected = selectedOf(html)
    expect(selected.filter((t) => t === '未入力')).toHaveLength(5)
    expect(selected).toContain('はい')
    expect(selected).toContain('いいえ')
  })
})
