// 仕様（統括の依頼 2026-11-06。出力のビューア 1-a）:
// V1: 判定の結果は、要る・要確認・要らない（理由つき）の順に並ぶ。判定の結果をそのまま使う（判定は変えない）。
// V2: 中身の種類は書類の区分で決まる。様式（form）は「様式が未配置（様式を置けば記入して出す）」、
//     計算・その他（calc・other）は「人が用意する書類」、図面（drawing）は「図枠（空欄つき）」。
// V3: 判定の名前が書類の定義に当たらないときは、中身は「人が用意する書類」（落とさない）。
// V4: IFC の件数（# で始まる行の数）と容量（UTF-8 の byte 数）を出す。
// V5: 左の一覧の先頭は「判定の一覧」と「IFC（BIM のモデル）」。
import { describe, expect, it } from 'vitest'
import docsJson from '../law/permitDocuments.json'
import type { PermitJudgement } from '../law/permitRequired'
import { CONTENT_LABEL, FIXED_VIEWER_ITEMS, ifcSummaryOf, viewerRowsOf } from './permitViewer'

const docs = (docsJson as unknown as { documents: { id: string; name: string; kind: string }[] }).documents
const byKind = (kind: string) => docs.find((d) => d.kind === kind)!.name

const JUDGEMENT: PermitJudgement = {
  required: [byKind('form')],
  notRequired: [{ name: byKind('drawing'), reason: '理由A' }],
  needsCheck: [{ name: byKind('calc'), reason: '理由B' }],
  applicability: { article6: '2号', article20: '3号' },
}

describe('ビューアの一覧（仕様 V1・V5）', () => {
  it('V1: 要る・要確認・要らない（理由つき）の順に並ぶ', () => {
    const rows = viewerRowsOf(JUDGEMENT, docs)
    expect(rows.map((r) => r.group)).toEqual(['要る', '要確認', '要らない'])
    expect(rows[2]!).toMatchObject({ name: byKind('drawing'), reason: '理由A' })
    expect(rows[1]!).toMatchObject({ name: byKind('calc'), reason: '理由B' })
    expect(rows[0]!.reason).toBeNull()
  })
})

describe('ビューアの中身の種類（仕様 V2・V3）', () => {
  it('V2: 様式は「様式が未配置（様式を置けば記入して出す）」', () => {
    expect(viewerRowsOf(JUDGEMENT, docs)[0]!.content).toBe(CONTENT_LABEL.form)
    expect(CONTENT_LABEL.form).toBe('様式が未配置（様式を置けば記入して出す）')
  })

  it('V2: 計算・その他は「人が用意する書類」、図面は「図枠（空欄つき）」', () => {
    const rows = viewerRowsOf(JUDGEMENT, docs)
    expect(rows[1]!.content).toBe('人が用意する書類')
    expect(rows[2]!.content).toBe('図枠（空欄つき）')
  })

  it('V3: 書類の定義に当たらない名前は「人が用意する書類」にする（落とさない）', () => {
    const rows = viewerRowsOf({ ...JUDGEMENT, required: ['存在しない書類'] }, docs)
    expect(rows[0]!).toMatchObject({ name: '存在しない書類', content: '人が用意する書類' })
  })
})

describe('IFC の件数（仕様 V4）', () => {
  it('V4: # で始まる行の数と、UTF-8 の byte 数を出す', () => {
    const text = 'ISO-10303-21;\n#1= IFCPROJECT(...);\n#2=IFCWALL(...);\nENDSEC;\n'
    expect(ifcSummaryOf(text)).toEqual({ entities: 2, bytes: new TextEncoder().encode(text).length })
  })
})

describe('ビューアの固定の項目（仕様 V5）', () => {
  it('V5: 左の一覧の先頭は「判定の一覧」と「IFC（BIM のモデル）」', () => {
    expect(FIXED_VIEWER_ITEMS).toEqual(['判定の一覧', 'IFC（BIM のモデル）'])
  })
})
