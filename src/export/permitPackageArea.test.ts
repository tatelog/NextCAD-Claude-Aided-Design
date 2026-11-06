// 仕様（統括の依頼 2026-11-06。3: 敷地面積は公図からの参考値。空欄の一覧にも出す）:
// PA1: 参考値の文（notes）は、空欄の一覧に出る。notes が無いときは出ない。
import { describe, expect, it } from 'vitest'
import docsJson from '../law/permitDocuments.json'
import type { PermitJudgement } from '../law/permitRequired'
import { AREA_REFERENCE_NOTE } from '../law/permitFormValues'
import { PACKAGE_LAYOUT, permitPackageFilesOf } from './permitPackage'

const docs = (docsJson as unknown as { documents: { id: string; name: string; kind: string }[] }).documents
const byKind = (kind: string) => docs.find((d) => d.kind === kind)!.name
const JUDGEMENT: PermitJudgement = {
  required: [byKind('form')],
  notRequired: [],
  needsCheck: [],
  applicability: { article6: '2号', article20: '3号' },
}
const BASE = {
  judgement: JUDGEMENT,
  docs,
  drawings: { site: '<svg>site</svg>', floorPlan: '<svg>plan</svg>' },
  ifcText: 'ISO-10303-21;',
  ifcFileName: 'model-ifc4.ifc',
}
const blankText = (files: { path: string; text: string }[]) => files.find((f) => f.path === PACKAGE_LAYOUT.blankFile)!.text

describe('参考値の文（仕様 PA1）', () => {
  it('PA1: notes の文は空欄の一覧に出る', () => {
    expect(blankText(permitPackageFilesOf({ ...BASE, notes: [AREA_REFERENCE_NOTE] }))).toContain(AREA_REFERENCE_NOTE)
  })

  it('PA1: notes が無ければ、参考値の文は出ない', () => {
    expect(blankText(permitPackageFilesOf(BASE))).not.toContain(AREA_REFERENCE_NOTE)
  })
})
