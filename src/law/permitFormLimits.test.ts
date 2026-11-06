// 仕様（統括の依頼 2026-11-06。容積率・建蔽率（7 欄のハ・ニ）は、用途地域等と同じ列（1 列目）。括弧は見出しの次の段落）:
// LM1: 第二号の 7 欄のハ（容積率）は、見出しの次の段落の 1 番目の括弧に入る。
// LM2: 第二号の 7 欄のニ（建蔽率）も、見出しの次の段落の 1 番目の括弧。
// LM3: 第三号の 7 欄のハ・ニも、同じ（見出しの次の段落）。
// LM4: 次の段落に括弧が無ければ、書かず理由「括弧が見つからない」で残す。
import { describe, expect, it } from 'vitest'
import permitFormsJson from './permitForms.json'
import type { FormDef } from './permitFormPlan'
import { fillInstructionsOf } from './permitFormFill'

const DEFS = (permitFormsJson as unknown as { forms: FormDef[] }).forms
const F2 = DEFS.find((d) => d.id === 'F2')!
const F3 = DEFS.find((d) => d.id === 'F3')!
const BRACKETS = '                        (            )(            )(            )(            )'

describe('容積率・建蔽率（仕様 LM1〜LM4）', () => {
  it('LM1: 第二号のハ（容積率）は、見出しの次の段落の 1 番目の括弧', () => {
    const r = fillInstructionsOf(F2, ['（第三面）', '【7.敷地面積】', '  【ﾊ.建築基準法第52条第１項及び第２項の規定による建築物の容積率】', BRACKETS], {
      'F2-3-07.容積率': { value: '200', from: '都市計画決定情報（PLATEAU）' },
    })
    expect(r.unwritten).toEqual([])
    expect(r.instructions).toMatchObject([{ paragraphIndex: 3, kind: 'blanks', bracket: 0, value: '200' }])
  })

  it('LM2: 第二号のニ（建蔽率）も、見出しの次の段落の 1 番目の括弧', () => {
    const r = fillInstructionsOf(F2, ['（第三面）', '【7.敷地面積】', '  【ﾆ.建築基準法第53条第１項の規定による建築物の建蔽率】', BRACKETS], {
      'F2-3-07.建蔽率': { value: '60', from: '都市計画決定情報（PLATEAU）' },
    })
    expect(r.instructions).toMatchObject([{ paragraphIndex: 3, kind: 'blanks', bracket: 0, value: '60' }])
  })

  it('LM3: 第三号のハ（容積率）とニ（建蔽率）も、見出しの次の段落', () => {
    const paragraphs = [
      '建築計画概要書（第二面）',
      '【7.敷地面積】',
      '　  【ハ.建築基準法第52条第１項及び第２項の規定による建築物の容積率】',
      BRACKETS,
      '　  【ニ.建築基準法第53条第１項の規定による建築物の建蔽率】',
      BRACKETS,
    ]
    const r = fillInstructionsOf(F3, paragraphs, {
      'F3-2-07.容積率': { value: '200', from: '都市計画決定情報（PLATEAU）' },
      'F3-2-07.建蔽率': { value: '60', from: '都市計画決定情報（PLATEAU）' },
    })
    expect(r.unwritten).toEqual([])
    expect(r.instructions.map((i) => [i.paragraphIndex, i.bracket, i.value])).toEqual([
      [3, 0, '200'],
      [5, 0, '60'],
    ])
  })

  it('LM4: 次の段落に括弧が無ければ、書かず「括弧が見つからない」で残す', () => {
    const r = fillInstructionsOf(F2, ['（第三面）', '【7.敷地面積】', '  【ﾊ.建築基準法第52条第１項及び第２項の規定による建築物の容積率】', '　　　　　　　　'], {
      'F2-3-07.容積率': { value: '200', from: '都市計画決定情報（PLATEAU）' },
    })
    expect(r.instructions).toEqual([])
    expect(r.unwritten[0]!.reason).toContain('括弧')
  })
})
