// 仕様（統括の依頼 2026-11-06。1-b: 一式の中身。フォルダ名は PACKAGE_LAYOUT の一か所だけ）:
// P1: 直下に 00_書類一覧.txt と 空欄の一覧.txt。図枠は 02_図面、IFC は 03_BIM。
// P2: IFC がまだ無い（外形が閉じていない）ときは IFC のファイルを入れず、空欄の一覧に「外形を閉じると作れます」と出す。
// P3: 00_書類一覧.txt は、適用の区分と、要る・要確認・要らない（理由つき）を並べる。
// P4: 空欄の一覧.txt は、要る・要確認の書類を、中身の種類つきで並べる。要らないは並べない。
// P5: フォルダ名は PACKAGE_LAYOUT から取る（直書きしない）。
import { describe, expect, it } from 'vitest'
import docsJson from '../law/permitDocuments.json'
import type { PermitJudgement } from '../law/permitRequired'
import { PACKAGE_LAYOUT, permitPackageFilesOf } from './permitPackage'

const docs = (docsJson as unknown as { documents: { id: string; name: string; kind: string }[] }).documents
const byKind = (kind: string) => docs.find((d) => d.kind === kind)!.name

const JUDGEMENT: PermitJudgement = {
  required: [byKind('form'), byKind('drawing')],
  notRequired: [{ name: '消防の書類（テスト）', reason: '理由A' }],
  needsCheck: [{ name: byKind('calc'), reason: '理由B' }],
  applicability: { article6: '2号', article20: '3号' },
}
const IFC = 'ISO-10303-21;\n#1=IFCPROJECT();\n'
const input = (ifcText: string | null) => ({ judgement: JUDGEMENT, docs, frameSvg: '<svg>frame</svg>', ifcText, ifcFileName: 'model-ifc4.ifc' })
const find = (files: { path: string; text: string }[], path: string) => files.find((f) => f.path === path)

describe('一式の中身（仕様 P1）', () => {
  it('P1: 直下に 00_書類一覧.txt と 空欄の一覧.txt、図枠は 02_図面、IFC は 03_BIM', () => {
    const paths = permitPackageFilesOf(input(IFC)).map((f) => f.path)
    expect(paths).toContain(PACKAGE_LAYOUT.judgementFile)
    expect(paths).toContain(PACKAGE_LAYOUT.blankFile)
    expect(paths).toContain(`${PACKAGE_LAYOUT.folders.drawing}/図枠.svg`)
    expect(paths).toContain(`${PACKAGE_LAYOUT.folders.bim}/model-ifc4.ifc`)
    expect(PACKAGE_LAYOUT.judgementFile).toBe('00_書類一覧.txt')
  })
})

describe('IFC が無いとき（仕様 P2）', () => {
  it('P2: IFC のファイルは入れず、空欄の一覧に「外形を閉じると作れます」と出す', () => {
    const files = permitPackageFilesOf(input(null))
    expect(files.some((f) => f.path.endsWith('.ifc'))).toBe(false)
    expect(find(files, PACKAGE_LAYOUT.blankFile)!.text).toContain('IFC（BIM のモデル）：ボリュームで外形を閉じると作れます')
  })
})

describe('書類一覧と空欄の一覧（仕様 P3・P4）', () => {
  it('P3: 00_書類一覧.txt は、適用の区分と、要る・要確認・要らない（理由つき）を並べる', () => {
    const text = find(permitPackageFilesOf(input(IFC)), PACKAGE_LAYOUT.judgementFile)!.text
    expect(text).toContain('要る（2）')
    expect(text).toContain('要確認（1）')
    expect(text).toContain('要らない（1）')
    expect(text).toContain(byKind('calc'))
    expect(text).toContain('理由A')
    expect(text).toContain('理由B')
  })

  it('P4: 空欄の一覧は、要る・要確認の書類を中身の種類つきで並べ、要らないは並べない', () => {
    const text = find(permitPackageFilesOf(input(IFC)), PACKAGE_LAYOUT.blankFile)!.text
    expect(text).toContain(`${byKind('form')}：様式が未配置（様式を置けば記入して出す）`)
    expect(text).toContain(`${byKind('calc')}：人が用意する書類`)
    expect(text).not.toContain('消防の書類（テスト）')
  })
})

describe('フォルダ名の一か所（仕様 P5）', () => {
  it('P5: フォルダ名は PACKAGE_LAYOUT から取る', () => {
    expect(PACKAGE_LAYOUT.folders).toEqual({ form: '01_申請書', drawing: '02_図面', bim: '03_BIM' })
  })
})
