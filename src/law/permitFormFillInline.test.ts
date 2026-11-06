// 仕様（統括の依頼 2026-11-06。4: inlineHeading）:
// IH1: 1 つの段落に見出しが 2 つ並ぶ（例「【ハ．郵便番号】　　　【ニ．住所】」）。郵便番号の値は、【ハ．郵便番号】の後ろ（【ニ．住所】の手前）に入る。
// IH2: 住所の値（inlineHeading＝【ニ．住所】の細目）は、【ニ．住所】の後ろに入る。
// IH3: 1 段落に 2 つの値が入っても、それぞれの見出しの後ろに入り、互いにずれない。
// IH4: 対応表の細目は、名前（行の名前）を inlineHeading の名前で付ける。同じ見出しの 2 つの細目が、別々の行になる。
import { describe, expect, it } from 'vitest'
import { replaceAfterHeadingInParagraph } from '../export/docxWrite'
import { fillInstructionsOf } from './permitFormFill'
import { planRowsOf, type FormDef } from './permitFormPlan'

const FORM: FormDef = {
  id: 'F8E',
  name: 'テスト',
  faces: [
    {
      no: 2,
      title: '第二面',
      fields: [
        {
          id: 'F8E-2-01',
          label: '設置者',
          tokyo: {
            face: '（第二面）',
            heading: '【1.設置者】',
            in: 'paragraph',
            place: 'afterHeading',
            note: '値は細目に入れる',
            subitems: [
              { heading: '【ハ．郵便番号】', in: 'paragraph', place: 'afterHeading', note: '同じ段落に【ニ．住所】が続く' },
              { heading: '【ハ．郵便番号】', in: 'paragraph', place: 'afterHeading', inlineHeading: '【ニ．住所】' },
            ],
          },
        },
      ],
    },
  ],
}
const PARAGRAPHS = ['（第二面）', '【1.設置者】', '  【ハ．郵便番号】　　　【ニ．住所】　　　']
const VALUES = {
  'F8E-2-01.郵便番号': { value: '1000001', from: '案件' },
  'F8E-2-01.住所': { value: '東京都千代田区', from: '案件' },
}

describe('1 段落に見出しが 2 つある細目（仕様 IH1・IH2）', () => {
  it('IH1・IH2: 郵便番号は【ハ．郵便番号】の後ろ、住所は【ニ．住所】の後ろに、同じ段落へ入る指示になる', () => {
    const r = fillInstructionsOf(FORM, PARAGRAPHS, VALUES)
    expect(r.unwritten).toEqual([])
    expect(r.instructions).toHaveLength(2)
    expect(r.instructions[0]).toMatchObject({ paragraphIndex: 2, kind: 'after', heading: '【ハ．郵便番号】', value: '1000001' })
    expect(r.instructions[1]).toMatchObject({ paragraphIndex: 2, kind: 'after', heading: '【ニ．住所】', value: '東京都千代田区' })
  })
})

describe('同じ段落に 2 つの値を入れる（仕様 IH3）', () => {
  it('IH3: 2 つの値は、それぞれの見出しの後ろに入る（前の値の位置がずれない）', () => {
    const xml = '<w:p><w:r><w:t xml:space="preserve">  【ハ．郵便番号】　　　【ニ．住所】　　　</w:t></w:r></w:p>'
    const once = replaceAfterHeadingInParagraph(xml, '【ハ．郵便番号】', '1000001')
    const twice = replaceAfterHeadingInParagraph(once, '【ニ．住所】', '東京都千代田区')
    const text = [...twice.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('')
    expect(text).toBe('  【ハ．郵便番号】1000001【ニ．住所】東京都千代田区')
  })
})

describe('細目の名前（仕様 IH4）', () => {
  it('IH4: 同じ見出しの 2 つの細目は、名前が別（郵便番号・住所）の行になる', () => {
    const rows = planRowsOf(FORM, PARAGRAPHS, {})
    const subIds = rows.map((r) => r.fieldId).filter((id) => id.startsWith('F8E-2-01.'))
    expect(subIds).toEqual(['F8E-2-01.郵便番号', 'F8E-2-01.住所'])
  })
})
