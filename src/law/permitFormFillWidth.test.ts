// 仕様（統括の依頼 2026-11-06。前面道路の幅員を、【ｲ.幅員】の「ｍ」の前に入れる）:
// FWD1: 幅員（F2-3-06.幅員）は、細目【ｲ.幅員】の段落の「ｍ」の前の空白に入る指示になる（段落の番号・単位・値）。
// 対応表（調査）が beforeUnit（ｍ）になるまで、実際の書き出しでは、今の入れ方（fillBlanks）のため書かれない。ここでは形だけを試験する。
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
          id: 'F2-3-06',
          label: '道路',
          tokyo: {
            face: '（第三面）',
            heading: '【6.道路】',
            in: 'paragraph',
            place: 'afterHeading',
            note: '値は細目に入れる',
            subitems: [{ heading: '【ｲ.幅員】', in: 'paragraph', place: 'beforeUnit', unit: 'ｍ' }],
          },
        },
      ],
    },
  ],
}

describe('前面道路の幅員の記入（仕様 FWD1）', () => {
  it('FWD1: 幅員は、【ｲ.幅員】の段落の「ｍ」の前に入る指示になる', () => {
    const r = fillInstructionsOf(FORM, ['（第三面）', '【6.道路】', '  【ｲ.幅員】　　 ｍ'], { 'F2-3-06.幅員': { value: '6.00', from: '数値指定' } })
    expect(r.unwritten).toEqual([])
    expect(r.instructions[0]).toMatchObject({ paragraphIndex: 2, kind: 'beforeUnit', unit: 'ｍ', value: '6.00' })
  })
})
