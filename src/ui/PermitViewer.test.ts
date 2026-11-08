// 仕様（統括の依頼 2026-11-06。出力のビューア 1-a・画面）:
// V6: （Codex の版で替わった。代表の決定 2026-11-08）左は、作成可能・追加の情報が必要・作成候補（未実装）・本システムで出力できないもの の 4 区分を件数つきで出す。
// V7: IFC がまだ無いときは、右に「平面を作成・保存するとIFCを出力できます。」と出す。あるときは件数と容量を出す。
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

// Codex の版を正とする（代表の決定 2026-11-08）: 一覧は「判定の一覧」と要る・要確認・要らないの見出しをやめ、
// 作れるかどうかの 4 区分（作成可能・追加の情報が必要・作成候補（未実装）・本システムで出力できないもの）に並べ替えた（BWC_HANDOFF.md「一覧」）
const groupsOf = (out: string) =>
  [...out.matchAll(/<section aria-label="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)].map((m) => ({
    name: m[1]!,
    heading: /<div[^>]*>([^<]*)<\/div>/.exec(m[2]!)![1]!,
    buttons: [...m[2]!.matchAll(/<button[^>]*aria-label="([^"]+)"/g)].map((b) => b[1]!),
  }))

describe('出力のビューアの一覧（仕様 V6）', () => {
  it('V6: 4 区分の見出しを件数つきで出し、各区分の件数は中のボタンの数と一致する。「判定の一覧」は無い', () => {
    const out = html(null)
    const groups = groupsOf(out)
    expect(groups.map((g) => g.name)).toEqual(['作成可能', '追加の情報が必要', '作成候補（未実装）', '本システムで出力できないもの'])
    for (const g of groups) expect(g.heading, g.name).toBe(`${g.name}（${g.buttons.length}）`)
    expect(out).not.toContain('判定の一覧')
    expect(out).not.toContain('要る（')
  })

  it('V6: IFC と書類が、作れるかどうかの区分に入る（IFC が無ければ「追加の情報が必要」、候補は「作成候補（未実装）」、計算書は「出力できないもの」）', () => {
    const groups = groupsOf(html(null))
    const inGroup = (name: string) => groups.find((g) => g.name === name)!.buttons
    expect(inGroup('作成可能')).toEqual([])
    expect(inGroup('追加の情報が必要')).toEqual(expect.arrayContaining(['IFC（BIM のモデル）', byKind('form'), byKind('drawing'), '配置図', '各階平面図', '床面積求積図', '日影図']))
    expect(inGroup('作成候補（未実装）')).toEqual(expect.arrayContaining(['二面以上の立面図', '二面以上の断面図', '各階床伏図', '小屋伏図', '基礎伏図']))
    expect(inGroup('本システムで出力できないもの')).toEqual([byKind('calc')])
  })

  it('V6: 選んでいるのは 1 つだけで、既定は一覧の先頭の書類（判定の一覧ではない）', () => {
    const out = html(null)
    expect(out.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(out).toMatch(/aria-label="([^"]+)"[^>]*aria-pressed="true"/)
    expect(/aria-label="([^"]+)"[^>]*aria-pressed="true"/.exec(out)![1]).toBe(byKind('form'))
  })
})

describe('出力のビューアの IFC（仕様 V7）', () => {
  // Codex の版を正とする（代表の決定 2026-11-08）: IFC が無いときの文は「平面を作成・保存するとIFCを出力できます。」に替わった（保存した平面から作るため）
  it('V7: IFC がまだ無いときは、右に「平面を作成・保存するとIFCを出力できます。」と出す', () => {
    const out = html(null, 'IFC（BIM のモデル）')
    expect(out).toContain('平面を作成・保存するとIFCを出力できます。')
    expect(out).not.toContain('ボリュームで外形を閉じると作れます')
  })

  // Codex の版を正とする（代表の決定 2026-11-08）: 保存した平面があり IFC を作れる（ifcReady）ときは「作成可能」に入り、作れる旨を出す
  it('V7: IFC を作れる（ifcReady）ときは、IFC が「作成可能」に入り、右に作れる様式名を出す', () => {
    const out = renderToStaticMarkup(createElement(PermitViewer, { judgement: JUDGEMENT, docs, ifcText: null, ifcReady: true, initialKey: 'IFC（BIM のモデル）' }))
    expect(groupsOf(out).find((g) => g.name === '作成可能')!.buttons).toEqual(['IFC（BIM のモデル）'])
    expect(out).toContain('保存済みの平面から IFC4 を生成できます。')
  })

  it('V7: IFC があるときは、エンティティ数と容量を出す', () => {
    const out = html('ISO-10303-21;\n#1=IFCPROJECT();\n#2=IFCWALL();\n', 'IFC（BIM のモデル）')
    expect(out).toContain('エンティティ 2 件')
    expect(out).toContain('容量')
  })
})
