// 仕様（統括の依頼 2026-11-06。構造の直し）: 構造は、見出しと同じ段落（または細目の段落）の「造」の前に入る。
// 括弧が無い段落でも書く（東京都の版は、「造」の前が空白だけ）。第三面の【ﾊ.構造】・第四面の【4.構造】・第六面の【ﾆ.】構造】。
// ST3: 第四面の【4.構造】は、「造」の前に入る指示になる（段落の番号・単位「造」・値）。
// ST4: 第三面の細目【ﾊ.構造】は、細目の段落の「造」の前に入る。
// ST5: 第六面の細目【ﾆ.】構造】（東京都の版の見出し）も、「造」の前に入る。
// ST6: 「造」の無い段落には書かず、理由「単位が無い」で残す（黙って抜けない）。
import { describe, expect, it } from 'vitest'
import type { FormDef } from './permitFormPlan'
import { fillInstructionsOf } from './permitFormFill'

const FORM: FormDef = {
  id: 'F2',
  name: 'テスト',
  faces: [
    {
      no: 3,
      title: '第三面',
      fields: [
        {
          id: 'F2-3-13',
          label: '建築物の高さ等',
          tokyo: {
            face: '（第三面）',
            heading: '【13.建築物の高さ等】',
            in: 'paragraph',
            place: 'afterHeading',
            note: '値は細目に入れる',
            subitems: [{ heading: '【ﾊ.構造】', in: 'paragraph', place: 'fillBlanks', note: '「造」「一部　造」の前' }],
          },
        },
      ],
    },
    {
      no: 4,
      title: '第四面',
      fields: [{ id: 'F2-4-04', label: '構造', tokyo: { face: '（第四面）', heading: '【4.構造】', in: 'paragraph', place: 'fillBlanks', note: '「造」「一部　造」の前' } }],
    },
    {
      no: 6,
      title: '第六面',
      fields: [
        {
          id: 'F2-6-03',
          label: '建築物の高さ等',
          tokyo: {
            face: '（第六面）',
            heading: '【3.建築物の高さ等】',
            in: 'paragraph',
            place: 'afterHeading',
            note: '値は細目に入れる',
            subitems: [{ heading: '【ﾆ.】構造】', in: 'paragraph', place: 'fillBlanks', note: '「造」「一部　造」の前' }],
          },
        },
      ],
    },
  ],
}
const STRUCTURE = { value: '鉄筋コンクリート', from: '案件' as const }

describe('構造の「造」の前（仕様 ST3〜ST6）', () => {
  it('ST3: 第四面の【4.構造】は、「造」の前に入る指示になる', () => {
    const r = fillInstructionsOf(FORM, ['（第四面）', '【4.構造】                  造    一部              造'], { 'F2-4-04': STRUCTURE })
    expect(r.unwritten).toEqual([])
    expect(r.instructions[0]).toMatchObject({ paragraphIndex: 1, kind: 'beforeUnit', heading: '【4.構造】', unit: '造', value: '鉄筋コンクリート' })
  })

  it('ST4: 第三面の細目【ﾊ.構造】は、細目の段落の「造」の前に入る', () => {
    const r = fillInstructionsOf(
      FORM,
      ['（第三面）', '【13.建築物の高さ等】     (申請に係る建築物)(他の建築物    )', '  【ﾊ.構造】                         造    一部                  造'],
      { 'F2-3-13.構造': STRUCTURE },
    )
    expect(r.unwritten).toEqual([])
    expect(r.instructions[0]).toMatchObject({ paragraphIndex: 2, kind: 'beforeUnit', unit: '造', value: '鉄筋コンクリート' })
  })

  it('ST5: 第六面の細目【ﾆ.】構造】（東京都の版の見出し）も、「造」の前に入る', () => {
    const r = fillInstructionsOf(
      FORM,
      ['（第六面）', '【3.建築物の高さ等】', '  【ﾆ.】構造】　　　　　　　　　造　　　一部　　　　　造'],
      { 'F2-6-03.構造': STRUCTURE },
    )
    expect(r.unwritten).toEqual([])
    expect(r.instructions[0]).toMatchObject({ paragraphIndex: 2, kind: 'beforeUnit', unit: '造', value: '鉄筋コンクリート' })
  })

  it('ST6: 「造」の無い段落には書かず、理由「単位が無い」で残す', () => {
    const r = fillInstructionsOf(FORM, ['（第四面）', '【4.構造】'], { 'F2-4-04': STRUCTURE })
    expect(r.instructions).toEqual([])
    expect(r.unwritten[0]!.reason).toContain('単位が無い')
  })
})
