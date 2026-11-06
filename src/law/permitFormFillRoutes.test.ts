// 仕様（統括の依頼 2026-11-06。2-c 補正）: 床面積の合計（F2-4-12）は、細目「ﾛ.合計」の段落の 3 つ目の括弧（合計）に入る。
// RM1: 床面積の合計は、段落「【ﾛ.合計】 (　)(　)(　)」の 3 つ目（インデックス 2）の括弧に入る。
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
            subitems: [
              { heading: '【ｲ.階別】', place: 'fillBlanks' },
              { heading: '【ﾛ.合計】', place: 'fillBlanks' },
            ],
          },
        },
      ],
    },
  ],
}

describe('床面積の合計の行き先（仕様 RM1）', () => {
  it('RM1: 合計は「【ﾛ.合計】」の段落の 3 つ目の括弧に入る', () => {
    const r = fillInstructionsOf(FORM, ['（第四面）', '【12.床面積】　　(申請部分)(申請以外の部分)(合計)', '  【ｲ.階別】　(　　)(　　)(　　)', '  【ﾛ.合計】             (               ) (               ) (               )'], {
      'F2-4-12': { value: '3000.00', from: 'ボリューム' },
    })
    expect(r.unwritten).toEqual([])
    expect(r.instructions).toHaveLength(1)
    expect(r.instructions[0]).toMatchObject({ paragraphIndex: 3, kind: 'blanks', bracket: 2, value: '3000.00' })
  })
})
