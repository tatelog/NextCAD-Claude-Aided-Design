// 仕様（統括の依頼 2026-11-06。工事種別: 新築を前提にしている。□新築 を ■新築 にする。ほかの □ はそのまま）:
// WK1: 第二号の第三面 9 欄（工事種別）は、見出しの次の段落の □新築 を ■ にする（段落の番号・語「新築」）。
// WK2: 第二号の第四面 3 欄（工事種別）も、同じ。
// WK3: 第三号の 9 欄（工事種別）も、同じ。
// WK4: 次の段落にも □新築 が無ければ、書かず「□」の理由で残す。
import { describe, expect, it } from 'vitest'
import permitFormsJson from './permitForms.json'
import type { FormDef } from './permitFormPlan'
import { fillInstructionsOf } from './permitFormFill'

const DEFS = (permitFormsJson as unknown as { forms: FormDef[] }).forms
const F2 = DEFS.find((d) => d.id === 'F2')!
const F3 = DEFS.find((d) => d.id === 'F3')!
const BOXES = '    □新築  □増築  □改築  □移転  □用途変更  □大規模の修繕  □大規模の模様替'
const NEW = { value: '新築', from: '案件' as const }

describe('工事種別の新築（仕様 WK1〜WK4）', () => {
  it('WK1: 第二号の第三面 9 欄は、見出しの次の段落の □新築 を ■ にする', () => {
    const r = fillInstructionsOf(F2, ['（第三面）', '【9.工事種別】', BOXES], { 'F2-3-09': NEW })
    expect(r.unwritten).toEqual([])
    expect(r.instructions).toMatchObject([{ paragraphIndex: 2, kind: 'check', value: '新築' }])
  })

  it('WK2: 第二号の第四面 3 欄も、見出しの次の段落の □新築', () => {
    const r = fillInstructionsOf(F2, ['（第四面）', '【3.工事種別】', BOXES], { 'F2-4-03': NEW })
    expect(r.instructions).toMatchObject([{ paragraphIndex: 2, kind: 'check', value: '新築' }])
  })

  it('WK3: 第三号の 9 欄も、見出しの次の段落の □新築', () => {
    const r = fillInstructionsOf(F3, ['建築計画概要書（第二面）', '【9.工事種別】', '　    □新築  □増築  □改築'], { 'F3-2-09': NEW })
    expect(r.instructions).toMatchObject([{ paragraphIndex: 2, kind: 'check', value: '新築' }])
  })

  it('WK4: 次の段落にも □新築 が無ければ、書かず「□」の理由で残す', () => {
    const r = fillInstructionsOf(F2, ['（第三面）', '【9.工事種別】', '    □増築  □改築'], { 'F2-3-09': NEW })
    expect(r.instructions).toEqual([])
    expect(r.unwritten[0]!.reason).toContain('□')
  })
})
