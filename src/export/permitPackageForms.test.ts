// 仕様（統括の依頼 2026-11-06。2-c）:
// P8: 記入した docx は、一式の zip の 01_申請書/ に、そのままのバイト列で入る。
// P9: 記入した docx が無いときは、01_申請書/ に何も入れない。
import { describe, expect, it } from 'vitest'
import docsJson from '../law/permitDocuments.json'
import type { PermitJudgement } from '../law/permitRequired'
import { permitPackageFilesOf } from './permitPackage'

const docs = (docsJson as unknown as { documents: { id: string; name: string; kind: string }[] }).documents
const JUDGEMENT: PermitJudgement = {
  required: [docs[0]!.name],
  notRequired: [],
  needsCheck: [],
  applicability: { article6: '2号', article20: '3号' },
}
const base = { judgement: JUDGEMENT, docs, drawings: { site: null, floorPlan: null }, ifcText: null, ifcFileName: 'model-ifc4.ifc' }

describe('記入した様式の入る場所（仕様 P8・P9）', () => {
  it('P8: 記入した docx は 01_申請書/ に、同じバイト列で入る', () => {
    const bytes = new Uint8Array([80, 75, 3, 4, 1, 2, 3])
    const files = permitPackageFilesOf({ ...base, filledForms: [{ fileName: '第二号様式_記入.docx', bytes }] })
    const f = files.find((x) => x.path === '01_申請書/第二号様式_記入.docx')
    expect(f).toBeDefined()
    expect(f!.bytes).toEqual(bytes)
  })

  it('P9: 記入した docx が無ければ、01_申請書/ には何も入らない', () => {
    const files = permitPackageFilesOf({ ...base, filledForms: [] })
    expect(files.some((f) => f.path.startsWith('01_申請書/'))).toBe(false)
  })
})
