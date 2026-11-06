// 仕様（統括の依頼 2026-11-06。8: 各階の床面積。欄の一覧（記入の一覧）も、書く内容と同じに見せる）:
// PL1: 階別の値があれば、欄の一覧の「階別」は「入れる」（最上階まで）と出る。
// PL2: 行が足りない（7 階以上）ときは、「入れる」と出さず、人が入れる（書かない）と出す。
import { describe, expect, it } from 'vitest'
import type { FormDef } from './permitFormPlan'
import { planRowsOf } from './permitFormPlan'

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
            note: '値は細目に入れる',
            subitems: [{ heading: '【ｲ.階別】', in: 'paragraph', place: 'fillBlanks' }],
          },
        },
      ],
    },
  ],
}
const PARAGRAPHS = ['（第四面）', '【12.床面積】', '  【ｲ.階別】 (    階)    (               ) (               ) (               )']

describe('欄の一覧の階別（仕様 PL1・PL2）', () => {
  it('PL1: 階別の値があれば、「入れる」（最上階まで）と出る', () => {
    const rows = planRowsOf(FORM, PARAGRAPHS, {
      'F2-4-12.階別1': { value: '400.00', from: 'ボリューム' },
      'F2-4-12.階別5': { value: '400.00', from: 'ボリューム' },
    })
    const row = rows.find((r) => r.fieldId === 'F2-4-12.階別')
    expect(row?.action).toEqual({ kind: 'fill', value: '最上階 5 階まで（各階）', from: 'ボリューム' })
  })

  it('PL2: 行が足りない（7 階以上）ときは、「入れる」と出さず、人が入れる', () => {
    const values: Record<string, { value: string; from: 'ボリューム' }> = {}
    for (let f = 1; f <= 7; f++) values[`F2-4-12.階別${f}`] = { value: '400.00', from: 'ボリューム' }
    const row = planRowsOf(FORM, PARAGRAPHS, values).find((r) => r.fieldId === 'F2-4-12.階別')
    expect(row?.action.kind).toBe('human')
  })
})
