// 仕様（統括の依頼 2026-11-06。2: 作れない図の理由を正しく出す）:
// PR1: 配置図が作れないときの理由（縮尺が無い）を、空欄の一覧に出す。理由が無いときは「敷地を確定すると出せます」。
import { describe, expect, it } from 'vitest'
import docsJson from '../law/permitDocuments.json'
import type { PermitJudgement } from '../law/permitRequired'
import { PACKAGE_LAYOUT, permitPackageFilesOf } from './permitPackage'

const docs = (docsJson as unknown as { documents: { id: string; name: string; kind: string }[] }).documents
const byKind = (kind: string) => docs.find((d) => d.kind === kind)!.name

const JUDGEMENT: PermitJudgement = {
  required: [byKind('form'), byKind('drawing')],
  notRequired: [],
  needsCheck: [],
  applicability: { article6: '2号', article20: '3号' },
}
const find = (files: { path: string; text: string }[], path: string) => files.find((f) => f.path === path)

describe('作れない図の理由（仕様 PR1）', () => {
  it('PR1: 配置図が縮尺が無いため作れないときは、その理由を空欄の一覧に出す', () => {
    const files = permitPackageFilesOf({
      judgement: JUDGEMENT,
      docs,
      drawings: {
        site: null,
        floorPlan: '<svg>plan</svg>',
        reasons: { site: '敷地が大きく、図枠に収まる縮尺が無い', floorPlan: '平面を作ると出せます' },
      },
      ifcText: null,
      ifcFileName: 'model-ifc4.ifc',
    })
    const text = find(files, PACKAGE_LAYOUT.blankFile)!.text
    expect(text).toContain('配置図：敷地が大きく、図枠に収まる縮尺が無い')
    expect(text).not.toContain('敷地を確定すると出せます')
    expect(files.some((f) => f.path.endsWith('配置図.svg'))).toBe(false)
  })
})
