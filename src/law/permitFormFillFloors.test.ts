// 仕様（統括の依頼 2026-11-06。8: 各階の床面積。最上階から。行が足りなければ書かず、「各階の床面積は別紙」）:
// FL3: 階ごとの値（F2-4-12.階別N。N は階の番号）は、階別の行に、最上階から一行ずつ入る（行の番号 = 最上階 − 階）。
//      行には、階の番号（（　階））と、面積（3 つ目の括弧＝合計）を入れる。
// FL4: 行の数（6 行）を超えるときは、書かず、理由「行が足りない（各階の床面積は別紙）」で残す。
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
            note: '値は細目に入れる',
            subitems: [{ heading: '【ｲ.階別】', in: 'paragraph', place: 'fillBlanks', note: '(　階)の行が見出しと同じ段落と次の 5 段落。最上階から' }],
          },
        },
      ],
    },
  ],
}
const FLOOR_PARAGRAPHS = [
  '（第四面）',
  '【12.床面積】　　(申請部分)(申請以外の部分)(合計)',
  '  【ｲ.階別】 (    階)    (               ) (               ) (               )',
  '             (    階)    (               ) (               ) (               )',
  '             (    階)    (               ) (               ) (               )',
  '             (    階)    (               ) (               ) (               )',
  '             (    階)    (               ) (               ) (               )',
  '             (    階)    (               ) (               ) (               )',
  '  【ﾛ.合計】             (               ) (               ) (               )',
]

describe('各階の床面積の行（仕様 FL3・FL4）', () => {
  it('FL3: 最上階（5 階）は見出しの行、4 階は次の行に入る（階の番号と、合計の面積）', () => {
    const r = fillInstructionsOf(FORM, FLOOR_PARAGRAPHS, {
      'F2-4-12.階別5': { value: '400.00', from: 'ボリューム' },
      'F2-4-12.階別4': { value: '400.00', from: 'ボリューム' },
    })
    expect(r.unwritten).toEqual([])
    const floor5 = r.instructions.filter((i) => i.fieldId === 'F2-4-12.階別5')
    // 統括の判断（2026-11-06）: 申請部分（1 番目）と合計（3 番目）に同じ値
    expect(floor5).toEqual([
      expect.objectContaining({ paragraphIndex: 2, kind: 'beforeUnit', heading: '【ｲ.階別】', unit: '階', value: '5' }),
      expect.objectContaining({ paragraphIndex: 2, kind: 'blanks', bracket: 0, value: '400.00' }),
      expect.objectContaining({ paragraphIndex: 2, kind: 'blanks', bracket: 2, value: '400.00' }),
    ])
    const floor4 = r.instructions.filter((i) => i.fieldId === 'F2-4-12.階別4')
    expect(floor4).toEqual([
      expect.objectContaining({ paragraphIndex: 3, kind: 'beforeUnit', unit: '階', value: '4' }),
      expect.objectContaining({ paragraphIndex: 3, kind: 'blanks', bracket: 0, value: '400.00' }),
      expect.objectContaining({ paragraphIndex: 3, kind: 'blanks', bracket: 2, value: '400.00' }),
    ])
  })

  it('FL4: 行が足りない（7 階以上）ときは書かず、理由に「各階の床面積は別紙」', () => {
    const values: Record<string, { value: string; from: 'ボリューム' }> = {}
    for (let f = 1; f <= 7; f++) values[`F2-4-12.階別${f}`] = { value: '400.00', from: 'ボリューム' }
    const r = fillInstructionsOf(FORM, FLOOR_PARAGRAPHS, values)
    expect(r.instructions.some((i) => i.fieldId === 'F2-4-12.階別7')).toBe(false)
    const u = r.unwritten.find((x) => x.fieldId === 'F2-4-12.階別1')
    expect(u?.reason).toContain('各階の床面積は別紙')
  })
})
