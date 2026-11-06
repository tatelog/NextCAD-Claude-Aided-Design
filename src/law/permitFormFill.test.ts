// 仕様（統括の依頼 2026-11-06。2-c: 欄の見出しで段落を探し、値を入れる。見つからない欄は書かない）:
// F1: ボリュームの値は、対応表の行き先（細目の括弧の何番目）に入る（建築面積の合計は 3 番目の括弧）。
// F2: 行政の欄は書かない（値があっても）。
// F3: 見出しが見つからない欄・行き先が無い欄は書かず、理由つきで「書けなかった」に残す。
// F4: 書く指示は、段落の番号（表の外の段落の並びの番号）と、入れ方（見出しの後ろ・括弧の番目）を持つ。
import { describe, expect, it } from 'vitest'
import type { FormDef, ValueMap } from './permitFormPlan'
import { fillInstructionsOf } from './permitFormFill'

// 建築面積（細目「ｲ.建築物全体」の括弧の 3 番目が合計）を模した最小の様式
const FORM: FormDef = {
  id: 'T',
  name: 'テスト',
  faces: [
    {
      no: 3,
      title: '第三面',
      fields: [
        {
          id: 'F2-3-10',
          label: '建築面積',
          tokyo: {
            face: '（第三面）',
            heading: '【10.建築面積】',
            in: 'paragraph',
            place: 'afterHeading',
            note: '値は細目に入れる。括弧は (申請部分)(申請以外の部分)(合計) の順',
            subitems: [{ heading: '【ｲ.建築物全体】', place: 'fillBlanks' }],
          },
        },
        { id: 'F2-3-99', label: '行政', tokyo: { face: '（第三面）', heading: '【99.手数料】', in: 'paragraph', place: 'afterHeading', note: '行政が記入' } },
        { id: 'F2-3-98', label: '無い', tokyo: { face: '（第三面）', heading: '【98.無い】', in: 'paragraph', place: 'afterHeading' } },
      ],
    },
  ],
}

const PARAGRAPHS = ['（第三面）', '【10.建築面積】　　(申請部分        )(申請以外の部分 )(合計           )', '  【ｲ.建築物全体】        (                )(               )(               )', '【99.手数料】']

const VALUES: ValueMap = {
  'F2-3-10': { value: '600.00', from: 'ボリューム' },
  'F2-3-99': { value: '1', from: '案件' },
}

describe('書く指示（仕様 F1〜F4）', () => {
  it('F1: 建築面積の合計は、細目「ｲ.建築物全体」の括弧の 3 番目（インデックス 2）に入る', () => {
    const r = fillInstructionsOf(FORM, PARAGRAPHS, VALUES)
    const ins = r.instructions.find((i) => i.fieldId === 'F2-3-10')
    expect(ins).toBeDefined()
    expect(ins!.paragraphIndex).toBe(2)
    expect(ins!.kind).toBe('blanks')
    expect(ins!.bracket).toBe(2)
    expect(ins!.value).toBe('600.00')
  })

  it('F2: 行政の欄は、値があっても書かない', () => {
    const r = fillInstructionsOf(FORM, PARAGRAPHS, VALUES)
    expect(r.instructions.some((i) => i.fieldId === 'F2-3-99')).toBe(false)
  })

  it('F3: 見出しの無い欄は書けなかった欄に残す（理由つき）', () => {
    const r = fillInstructionsOf(FORM, PARAGRAPHS, { 'F2-3-98': { value: '1', from: '案件' } })
    expect(r.instructions).toEqual([])
    expect(r.unwritten.map((u) => u.fieldId)).toEqual(['F2-3-98'])
    expect(r.unwritten[0]!.reason).toContain('見出し')
  })

  it('F4: 書く指示は、段落の番号（表の外の段落の並び）と、入れ方を持つ', () => {
    const r = fillInstructionsOf(FORM, PARAGRAPHS, VALUES)
    for (const i of r.instructions) {
      expect(typeof i.paragraphIndex).toBe('number')
      expect(['after', 'blanks']).toContain(i.kind)
    }
  })
})
