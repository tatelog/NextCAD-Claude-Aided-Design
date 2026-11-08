// 仕様（統括の依頼 2026-11-06。2-c の補正）: 行き先の表に無い欄は、見出しの後ろに入れてよいのは「細目を持たず、注記に細目と書かれていない」欄だけ。
// R1: 細目を持つ欄は、行き先の表に無ければ書かない（見出しの後ろに入れると位置がずれる）。
// R2: 括弧（fillBlanks）の欄は、行き先の表に無ければ書かない（構造の「造」の前などは別の規則）。
import { describe, expect, it } from 'vitest'
import type { FormDef } from './permitFormPlan'
import { fillInstructionsOf } from './permitFormFill'

const FORM: FormDef = {
  id: 'F2',
  name: 'テスト',
  faces: [
    {
      no: 4,
      title: '第四面',
      fields: [
        {
          id: 'F2-4-12',
          label: '床面積',
          tokyo: {
            face: '（第四面）',
            heading: '【12.床面積】',
            in: 'paragraph',
            place: 'afterHeading',
            note: '値は細目に入れる。括弧は (申請部分)(申請以外の部分)(合計) の順',
            subitems: [{ heading: '【ｲ.階別】', place: 'fillBlanks' }],
          },
        },
        // 行き先の表に無い括弧の欄（F2-4-04 の構造は、統括の決まりで行き先の表に入ったので、ここでは使わない）
        { id: 'F2-4-05', label: '括弧の欄（試験）', tokyo: { face: '（第四面）', heading: '【4.構造】', in: 'paragraph', place: 'fillBlanks', note: '「造」の前' } },
      ],
    },
  ],
}
const PARAGRAPHS = ['（第四面）', '【12.床面積】　　(申請部分)(申請以外の部分)(合計)', '  【ｲ.階別】　(　　)(　　)(　　)', '【4.構造】　（　）造']

describe('既定の入れ方の規則（仕様 R1・R2）', () => {
  it('R1: 細目を持つ欄は、行き先の表に無ければ書かない（見出しの後ろには入れない）', () => {
    const r = fillInstructionsOf(FORM, PARAGRAPHS, { 'F2-4-12': { value: '3000.00', from: 'ボリューム' } })
    expect(r.instructions).toEqual([])
    expect(r.unwritten.map((u) => u.fieldId)).toEqual(['F2-4-12'])
  })

  it('R2: 括弧の欄は、行き先の表に無ければ書かない', () => {
    const r = fillInstructionsOf(FORM, PARAGRAPHS, { 'F2-4-05': { value: 'RC', from: '案件' } })
    expect(r.instructions).toEqual([])
    expect(r.unwritten[0]!.fieldId).toBe('F2-4-05')
  })

  it('R3: 括弧が無い段落には、括弧の番目を指定しても書かない（書けなかった欄に残す）', () => {
    const FORM3: FormDef = {
      id: 'F2',
      name: 'テスト3',
      faces: [
        {
          no: 4,
          title: '第四面',
          fields: [
            {
              id: 'F2-4-08',
              label: '階数',
              tokyo: {
                face: '（第四面）',
                heading: '【8.階数】',
                in: 'paragraph',
                place: 'afterHeading',
                note: '値は細目に入れる',
                subitems: [{ heading: '【ｲ.地階を除く階数】', place: 'fillBlanks' }],
              },
            },
          ],
        },
      ],
    }
    const P3 = ['（第四面）', '【8.階数】', '  【ｲ.地階を除く階数】 階']
    const r = fillInstructionsOf(FORM3, P3, { 'F2-4-08': { value: '5', from: 'ボリューム' } })
    expect(r.instructions).toEqual([])
    expect(r.unwritten[0]!.reason).toContain('括弧')
  })
})
