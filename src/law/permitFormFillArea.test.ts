// 仕様（統括の依頼 2026-11-06。1・3: 敷地面積の列は、列 1（括弧 0）。ホの合計は、対応表の入れ方に従う）:
// FA1: 敷地面積（イ）は、【ｲ.敷地面積】の段落の 1 つ目の括弧（列 1）に入る（単一の地域。残りの列は空欄）。
// FA2: 敷地面積の合計（ホ）は、対応表の入れ方が beforeUnit（単位「㎡」）なら、単位の前に入る。
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
          id: 'F2-3-07',
          label: '敷地面積',
          tokyo: {
            face: '（第三面）',
            heading: '【7.敷地面積】',
            in: 'paragraph',
            place: 'afterHeading',
            note: '値は細目に入れる',
            subitems: [
              { heading: '【ｲ.敷地面積】', in: 'paragraph', place: 'fillBlanks' },
              { heading: '【ﾎ.敷地面積の合計】', in: 'paragraph', place: 'beforeUnit', unit: '㎡' },
            ],
          },
        },
      ],
    },
  ],
}

describe('敷地面積の記入（仕様 FA1・FA2）', () => {
  it('FA1: 敷地面積は、【ｲ.敷地面積】の 1 つ目の括弧（列 1）に入る', () => {
    const r = fillInstructionsOf(
      FORM,
      ['（第三面）', '【7.敷地面積】', '  【ｲ.敷地面積】 (1)　（　）（　）（　）（　）', '  (2)　（　）（　）（　）（　）'],
      { 'F2-3-07.敷地面積': { value: '1200.00', from: '公図の参考値' } },
    )
    expect(r.unwritten).toEqual([])
    expect(r.instructions).toHaveLength(1)
    expect(r.instructions[0]).toMatchObject({ paragraphIndex: 2, kind: 'blanks', bracket: 0, value: '1200.00' })
  })

  it('FA2: 敷地面積の合計は、対応表が beforeUnit（㎡）なら、単位の前に入る', () => {
    const r = fillInstructionsOf(
      FORM,
      ['（第三面）', '【7.敷地面積】', '  【ｲ.敷地面積】 (1)　（　）（　）（　）（　）', '  【ﾎ.敷地面積の合計】　　㎡'],
      { 'F2-3-07.敷地面積の合計': { value: '1200.00', from: '公図の参考値' } },
    )
    expect(r.unwritten).toEqual([])
    expect(r.instructions[0]).toMatchObject({ paragraphIndex: 3, kind: 'beforeUnit', unit: '㎡', value: '1200.00' })
  })
})
