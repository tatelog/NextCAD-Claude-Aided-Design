// 仕様（統括の依頼 2026-11-06。判断の答え: 新築なので建物全体が申請部分。建築面積・延べ面積・各階の床面積の行・床面積の合計は、
// 申請部分（1 番目の括弧）と合計（3 番目の括弧）の両方に同じ値。申請以外の部分（2 番目）は空欄）:
// AP1: 建築面積（F2-3-10）は、【ｲ.建築物全体】の段落の 1 番目（申請部分）と 3 番目（合計）に入る。
// AP2: 床面積の合計（F2-4-12）は、【ﾛ.合計】の段落の 1 番目と 3 番目に入る。
// AP3（調査の指摘 2026-11-06 を反映）: 用途別床面積（第五面）の共同住宅の行（【ｲ.】）は、
//      1 番目（用途の区分の記号）は空欄（記号の表の出どころが未決）、2 番目（具体的な用途の名称）に「共同住宅」、
//      3 番目（床面積）にその階の床面積（ボリュームの建築面積。各階は同じ形）。延べ床面積は第四面の 12 欄（合計）の値で、ここには入れない。
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
          id: 'F2-3-10',
          label: '建築面積',
          tokyo: {
            face: '（第三面）',
            heading: '【10.建築面積】',
            in: 'paragraph',
            place: 'afterHeading',
            note: '値は細目に入れる',
            subitems: [{ heading: '【ｲ.建築物全体】', in: 'paragraph', place: 'fillBlanks' }],
          },
        },
      ],
    },
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
            subitems: [{ heading: '【ﾛ.合計】', in: 'paragraph', place: 'fillBlanks' }],
          },
        },
      ],
    },
    {
      no: 5,
      title: '第五面',
      fields: [
        {
          id: 'F2-5-07',
          label: '用途別床面積',
          tokyo: {
            face: '（第五面）',
            heading: '【7.用途別床面積】',
            in: 'paragraph',
            place: 'afterHeading',
            note: '値は細目に入れる',
            subitems: [{ heading: '【ｲ.】', in: 'paragraph', place: 'fillBlanks' }],
          },
        },
      ],
    },
  ],
}

describe('申請部分と合計（仕様 AP1・AP2）', () => {
  it('AP1: 建築面積は、【ｲ.建築物全体】の 1 番目（申請部分）と 3 番目（合計）に入る', () => {
    const r = fillInstructionsOf(
      FORM,
      ['（第三面）', '【10.建築面積】', '  【ｲ.建築物全体】　　　(　　　)(　　　)(　　　)'],
      { 'F2-3-10': { value: '400.00', from: 'ボリューム' } },
    )
    expect(r.unwritten).toEqual([])
    expect(r.instructions.map((i) => [i.paragraphIndex, i.bracket, i.value])).toEqual([
      [2, 0, '400.00'],
      [2, 2, '400.00'],
    ])
  })

  it('AP2: 床面積の合計は、【ﾛ.合計】の 1 番目と 3 番目に入る', () => {
    const r = fillInstructionsOf(
      FORM,
      ['（第四面）', '【12.床面積】', '  【ﾛ.合計】             (               ) (               ) (               )'],
      { 'F2-4-12': { value: '2000.00', from: 'ボリューム' } },
    )
    expect(r.unwritten).toEqual([])
    expect(r.instructions.map((i) => [i.paragraphIndex, i.bracket, i.value])).toEqual([
      [2, 0, '2000.00'],
      [2, 2, '2000.00'],
    ])
  })
})

describe('用途別床面積（仕様 AP3）', () => {
  it('AP3: 共同住宅の行（【ｲ.】）の 2 番目に「共同住宅」、3 番目にその階の床面積。1 番目（記号）は空欄', () => {
    const r = fillInstructionsOf(
      FORM,
      ['（第五面）', '【7.用途別床面積】', '　　　  （用途の区分　　）（具体的な用途の名称）（床面積　　）', '　【ｲ.】（　　）（　　）（　　）㎡', '　【ﾛ.】（　　）（　　）（　　）'],
      { 'F2-5-07.用途': { value: '共同住宅', from: '案件' }, 'F2-5-07.床面積': { value: '400.00', from: 'ボリューム' } },
    )
    expect(r.unwritten).toEqual([])
    expect(r.instructions.map((i) => [i.paragraphIndex, i.bracket, i.value])).toEqual([
      [3, 1, '共同住宅'],
      [3, 2, '400.00'],
    ])
  })
})
