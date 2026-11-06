// 仕様（統括の依頼 2026-11-06。出力のビューア 1-a・画面）:
// V6: 左は「判定の一覧」「IFC（BIM のモデル）」の先頭に続けて、要る（件数）・要確認（件数）・要らない（件数）の見出しを出す。
// V7: IFC がまだ無い（外形が閉じていない）ときは、右に「ボリュームで外形を閉じると作れます」と出す。あるときは件数と容量を出す。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import docsJson from '../law/permitDocuments.json'
import type { PermitJudgement } from '../law/permitRequired'
import { PermitViewer } from './PermitViewer'

const docs = (docsJson as unknown as { documents: { id: string; name: string; kind: string }[] }).documents
const byKind = (kind: string) => docs.find((d) => d.kind === kind)!.name

const JUDGEMENT: PermitJudgement = {
  required: [byKind('form')],
  notRequired: [{ name: byKind('drawing'), reason: '理由A' }],
  needsCheck: [{ name: byKind('calc'), reason: '理由B' }],
  applicability: { article6: '2号', article20: '3号' },
}

const html = (ifcText: string | null, initialKey?: string) =>
  renderToStaticMarkup(createElement(PermitViewer, { judgement: JUDGEMENT, docs, ifcText, initialKey }))

describe('出力のビューアの一覧（仕様 V6）', () => {
  it('V6: 先頭に「判定の一覧」「IFC（BIM のモデル）」、続けて要る・要確認・要らない（件数つき）の見出し', () => {
    const out = html(null)
    expect(out).toContain('判定の一覧')
    expect(out).toContain('IFC（BIM のモデル）')
    expect(out).toContain('要る（1）')
    expect(out).toContain('要確認（1）')
    expect(out).toContain('要らない（1）')
  })
})

describe('出力のビューアの IFC（仕様 V7）', () => {
  it('V7: IFC がまだ無いときは、右に「ボリュームで外形を閉じると作れます」と出す', () => {
    expect(html(null, 'IFC（BIM のモデル）')).toContain('ボリュームで外形を閉じると作れます')
  })

  it('V7: IFC があるときは、エンティティ数と容量を出す', () => {
    const out = html('ISO-10303-21;\n#1=IFCPROJECT();\n#2=IFCWALL();\n', 'IFC（BIM のモデル）')
    expect(out).toContain('エンティティ 2 件')
    expect(out).toContain('容量')
  })
})
