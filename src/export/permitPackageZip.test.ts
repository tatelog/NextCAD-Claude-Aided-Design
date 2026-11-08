// 仕様（統括の依頼 2026-11-06。zip の中身は変えない。別の読み手（jszip）で開いても、同じ名前・同じバイト列で読める）:
// ZP1: 記入した第二号・第三号の docx を入れた zip を jszip で開くと、01_申請書/ の同じ名前で、同じバイト列が読める。
// ZP2: zip の中身のファイル名は、一式のファイル一覧（permitPackageFilesOf）と一致する。余計なものは入らない。
import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import docsJson from '../law/permitDocuments.json'
import type { PermitJudgement } from '../law/permitRequired'
import { permitPackageFilesOf } from './permitPackage'
import { buildZip } from './zipWriter'

const docs = (docsJson as unknown as { documents: { id: string; name: string; kind: string }[] }).documents
const JUDGEMENT: PermitJudgement = {
  required: [docs[0]!.name],
  notRequired: [],
  needsCheck: [],
  applicability: { article6: '2号', article20: '3号' },
}
const base = { judgement: JUDGEMENT, docs, drawings: { site: null, floorPlan: null }, ifcText: null, ifcFileName: 'model-ifc4.ifc' }
const F2_BYTES = new Uint8Array([80, 75, 3, 4, 1, 2, 3])
const F3_BYTES = new Uint8Array([80, 75, 3, 4, 9, 8, 7, 6])

function packageZipOf() {
  const files = permitPackageFilesOf({
    ...base,
    filledForms: [
      { fileName: '第二号様式_記入.docx', bytes: F2_BYTES },
      { fileName: '第三号様式_記入.docx', bytes: F3_BYTES },
    ],
  })
  const zip = buildZip(files.map((f) => ({ path: f.path, data: f.bytes ?? new TextEncoder().encode(f.text) })))
  return { files, zip }
}

describe('一式の zip の中身（仕様 ZP1・ZP2）', () => {
  it('ZP1: 記入した第二号・第三号の docx は、別の読み手で開いても同じ名前・同じバイト列で読める', async () => {
    const { zip } = packageZipOf()
    const read = await JSZip.loadAsync(zip)
    const f2 = await read.file('01_申請書/第二号様式_記入.docx')!.async('uint8array')
    const f3 = await read.file('01_申請書/第三号様式_記入.docx')!.async('uint8array')
    expect(f2).toEqual(F2_BYTES)
    expect(f3).toEqual(F3_BYTES)
  })

  it('ZP2: zip の中のファイル名は、一式のファイル一覧と一致する（余計なものは入らない）', async () => {
    const { files, zip } = packageZipOf()
    const read = await JSZip.loadAsync(zip)
    const inZip = Object.values(read.files)
      .filter((f) => !f.dir)
      .map((f) => f.name)
      .sort()
    expect(inZip).toEqual(files.map((f) => f.path).sort())
  })
})
