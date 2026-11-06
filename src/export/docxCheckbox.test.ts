// 仕様（統括の依頼 2026-11-06。4: 防火地域の □ ）: 選ばれた地域の □ を ■ に替える（レ点の文字は足さない）。
// CK1: 段落の中の「□防火地域」の □ を ■ にする。ほかの □（準防火地域・指定なし）は替えない。
// CK2: その語の □ が段落に無ければ、何も替えない。
import { describe, expect, it } from 'vitest'
import { checkInParagraph } from './docxWrite'

const xmlOf = (text: string) => `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`
const textOf = (xml: string) => [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('')

describe('防火地域の □（仕様 CK1・CK2）', () => {
  it('CK1: 選んだ語の □ だけを ■ にする（レ点は足さない）', () => {
    const p = xmlOf('【4.防火地域】　□防火地域　□準防火地域　□指定なし')
    expect(textOf(checkInParagraph(p, '防火地域'))).toBe('【4.防火地域】　■防火地域　□準防火地域　□指定なし')
  })

  it('CK1: 準防火地域を選ぶと、準防火地域の □ だけが替わる（防火地域の □ は替えない）', () => {
    const p = xmlOf('【4.防火地域】　□防火地域　□準防火地域　□指定なし')
    expect(textOf(checkInParagraph(p, '準防火地域'))).toBe('【4.防火地域】　□防火地域　■準防火地域　□指定なし')
  })

  it('CK2: 語の □ が段落に無ければ、何も替えない', () => {
    const p = xmlOf('【4.防火地域】　□防火地域')
    expect(textOf(checkInParagraph(p, '指定なし'))).toBe('【4.防火地域】　□防火地域')
  })
})
