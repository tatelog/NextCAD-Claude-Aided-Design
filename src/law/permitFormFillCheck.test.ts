// 仕様（統括の依頼 2026-11-06。4・6）:
// FC1: 防火地域（F2-3-04）は、見出しと同じ段落の □ を選んだ語で ■ にする指示になる（段落の番号・語）。
// FC2: 選んだ語の □ が段落に無ければ、書かず理由「□」で残す。
// ST1: 構造（F2-4-04）は、見出しと同じ段落の、「造」の前の括弧（1 つ目）に入る。
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
          id: 'F2-3-04',
          label: '防火地域',
          tokyo: { face: '（第三面）', heading: '【4.防火地域】', in: 'paragraph', place: 'checkbox', note: '□防火地域 □準防火地域 □指定なし は見出しと同じ段落' },
        },
      ],
    },
    {
      no: 4,
      title: '第四面',
      fields: [
        {
          id: 'F2-4-04',
          label: '構造',
          tokyo: { face: '（第四面）', heading: '【4.構造】', in: 'paragraph', place: 'fillBlanks', note: '「造」「一部　造」の前' },
        },
      ],
    },
  ],
}

describe('防火地域のチェック（仕様 FC1・FC2）', () => {
  const PARAGRAPHS = ['（第三面）', '【4.防火地域】　□防火地域　□準防火地域　□指定なし']

  it('FC1: 防火地域は、見出しと同じ段落の □ を選んだ語で ■ にする指示になる', () => {
    const r = fillInstructionsOf(FORM, PARAGRAPHS, { 'F2-3-04': { value: '防火地域', from: '法規' } })
    expect(r.unwritten).toEqual([])
    expect(r.instructions[0]).toMatchObject({ paragraphIndex: 1, kind: 'check', value: '防火地域' })
  })

  it('FC1: 指定なし（□指定なし）も、同じ形で選べる', () => {
    const r = fillInstructionsOf(FORM, PARAGRAPHS, { 'F2-3-04': { value: '指定なし', from: '法規' } })
    expect(r.instructions[0]).toMatchObject({ paragraphIndex: 1, kind: 'check', value: '指定なし' })
  })

  it('FC2: 選んだ語の □ が段落に無ければ、書かず「□」の理由で残す', () => {
    const r = fillInstructionsOf(FORM, ['（第三面）', '【4.防火地域】　□防火地域'], { 'F2-3-04': { value: '指定なし', from: '法規' } })
    expect(r.instructions).toEqual([])
    expect(r.unwritten[0]!.reason).toContain('□')
  })
})

describe('構造（仕様 ST1）', () => {
  it('ST1: 構造は、見出しと同じ段落の、「造」の前の括弧（1 つ目）に入る', () => {
    const r = fillInstructionsOf(FORM, ['（第四面）', '【4.構造】　（　）造'], { 'F2-4-04': { value: '鉄筋コンクリート', from: '案件' } })
    expect(r.unwritten).toEqual([])
    expect(r.instructions[0]).toMatchObject({ paragraphIndex: 1, kind: 'blanks', bracket: 0, value: '鉄筋コンクリート' })
  })
})
