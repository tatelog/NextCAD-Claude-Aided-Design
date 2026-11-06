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
import { CONTENT_LABEL, FIXED_VIEWER_ITEMS, formKindOfName, ifcSummaryOf, rowContentOf, viewerRowsOf } from './permitViewer'

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

  it('V2: 計算・その他は「人が用意する書類」。図面は配置図と各階平面図以外「未作成」', () => {
    const rows = viewerRowsOf(JUDGEMENT, docs)
    expect(rows[1]!.content).toBe('人が用意する書類')
    expect(rows[2]!.content).toBe(CONTENT_LABEL.notMade)
    expect(CONTENT_LABEL.notMade).toBe('未作成')
  })

  it('V8: 配置図と各階平面図は、それぞれの中身の種類を持つ', () => {
    const j: PermitJudgement = { ...JUDGEMENT, required: ['配置図', '各階平面図'], notRequired: [], needsCheck: [] }
    const rows = viewerRowsOf(j, docs)
    expect(rows[0]!.content).toBe(CONTENT_LABEL.site)
    expect(rows[1]!.content).toBe(CONTENT_LABEL.floorPlan)
    expect(CONTENT_LABEL.site).toBe('配置図（確定した敷地と周辺建物の輪郭）')
    expect(CONTENT_LABEL.floorPlan).toBe('各階平面図（基準階 1 枚）')
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

// 仕様（統括の判断 2026-11-06・BwC のメッセージ 3）: 記入した様式がある行の中身は、正しい状態を出す（記入後も「様式が未配置」は誤り）。
describe('記入した様式の中身（仕様 V9）', () => {
  const F2_NAME = '確認申請書（第二号様式）'
  const F3_NAME = '建築計画概要書（第三号様式）'
  const F8_NAME = '確認申請書（昇降機）（第八号様式・昇降機用）'
  const F8E_NAME = '確認申請書（昇降機以外の建築設備）（第八号様式・昇降機以外の建築設備用）'

  it('V9-1: 記入した様式の行の中身は「記入済み（一式の 01_申請書 に入る）」', () => {
    const rows = viewerRowsOf({ ...JUDGEMENT, required: [F2_NAME], notRequired: [], needsCheck: [] }, docs)
    expect(rowContentOf(rows[0]!, { F2: {} })).toBe(CONTENT_LABEL.formFilled)
    expect(CONTENT_LABEL.formFilled).toBe('記入済み（一式の 01_申請書 に入る）')
  })

  it('V9-2: 記入していない様式の行は、従来の「様式が未配置（様式を置けば記入して出す）」のまま。別の様式を記入しても変えない', () => {
    const rows = viewerRowsOf({ ...JUDGEMENT, required: [F2_NAME], notRequired: [], needsCheck: [] }, docs)
    expect(rowContentOf(rows[0]!, {})).toBe(CONTENT_LABEL.form)
    expect(rowContentOf(rows[0]!, { F3: {} })).toBe(CONTENT_LABEL.form)
  })

  it('V9-3: 様式以外（計算・図面・人が用意）の行は、記入の有無で中身を変えない', () => {
    const rows = viewerRowsOf(JUDGEMENT, docs)
    const calc = rows.find((r) => r.name === byKind('calc'))!
    expect(rowContentOf(calc, { F2: {}, F3: {} })).toBe(calc.content)
    expect(calc.content).toBe('人が用意する書類')
  })

  it('V9-4: 書類の名前から様式を区別する（第二号・第三号・第八号の 2 つ）。様式でない名前は null', () => {
    expect(formKindOfName(F2_NAME)).toBe('F2')
    expect(formKindOfName(F3_NAME)).toBe('F3')
    expect(formKindOfName(F8_NAME)).toBe('F8')
    expect(formKindOfName(F8E_NAME)).toBe('F8E')
    expect(formKindOfName('配置図')).toBeNull()
  })
})
