// 仕様（統括の依頼 2026-11-06。2-c 補正: 単位の前に入れる細目）:
// BU1: 対応表の細目が place=beforeUnit（unit=「階」）なら、単位の前に入れる指示になる（段落の番号・単位・値）。
// BU2: 単位が段落に無ければ、書かない（書けなかった欄に残す。理由に「単位」）。
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
          id: 'F2-4-08',
          label: '階数',
          tokyo: {
            face: '（第四面）',
            heading: '【8.階数】',
            in: 'paragraph',
            place: 'afterHeading',
            note: '値は細目に入れる',
            subitems: [{ heading: '【ｲ.地階を除く階数】', place: 'beforeUnit', unit: '階' }],
          },
        },
      ],
    },
  ],
}

describe('単位の前に入れる細目（仕様 BU1・BU2）', () => {
  it('BU1: 単位の前に入れる指示（段落の番号・単位・値）になる', () => {
    const r = fillInstructionsOf(FORM, ['（第四面）', '【8.階数】', '  【ｲ.地階を除く階数】 階'], { 'F2-4-08': { value: '5', from: 'ボリューム' } })
    expect(r.unwritten).toEqual([])
    expect(r.instructions).toHaveLength(1)
    expect(r.instructions[0]).toMatchObject({ paragraphIndex: 2, kind: 'beforeUnit', unit: '階', value: '5' })
  })

  it('BU2: 単位が段落に無ければ、書かず「単位」の理由で残す', () => {
    const r = fillInstructionsOf(FORM, ['（第四面）', '【8.階数】', '  【ｲ.地階を除く階数】'], { 'F2-4-08': { value: '5', from: 'ボリューム' } })
    expect(r.instructions).toEqual([])
    expect(r.unwritten[0]!.reason).toContain('単位')
  })
})
