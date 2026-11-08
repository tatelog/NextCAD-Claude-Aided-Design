// 仕様（統括の依頼 2026-11-06。2-c 補正: 単位の前に入れる欄。対応表は place=beforeUnit と unit（「階」「ｍ」）で示す）:
// WU1: 見出しの後ろにある単位の前の空白を、値に置き換える。見出しの中の同じ文字（「階数」の「階」）には入れない。
// WU2: 単位が段落に無ければ、何も書かない。
// WU3: 記入した docx を読み戻すと、単位の前に値が入っている。
import { describe, expect, it } from 'vitest'
import { beforeUnitInParagraph, fillDocx } from './docxWrite'
import { readDocx } from './docxRead'
import { buildZip } from './zipWriter'

const P = (text: string) => `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`
const textOf = (xml: string) => (xml.match(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g) ?? []).map((x) => x.replace(/^<w:t(?: [^>]*)?>|<\/w:t>$/g, '')).join('')

describe('単位の前に入れる（仕様 WU1・WU2）', () => {
  it('WU1: 「階」の前の空白を値に置き換える（見出しの「階数」の「階」には入れない）', () => {
    const out = beforeUnitInParagraph(P('  【ｲ.地階を除く階数】 階'), '【ｲ.地階を除く階数】', '階', '5')
    expect(textOf(out)).toBe('  【ｲ.地階を除く階数】5階')
  })

  it('WU1: 全角の「ｍ」の前の空白を値に置き換える', () => {
    const out = beforeUnitInParagraph(P('  【ｲ.最高の高さ】     ｍ'), '【ｲ.最高の高さ】', 'ｍ', '15.00')
    expect(textOf(out)).toBe('  【ｲ.最高の高さ】15.00ｍ')
  })

  it('WU2: 単位が段落に無ければ、何も書かない', () => {
    const p = P('【ﾛ.地階の階数】')
    expect(beforeUnitInParagraph(p, '【ﾛ.地階の階数】', '階', '2')).toBe(p)
  })
})

describe('記入した docx（仕様 WU3）', () => {
  it('WU3: 単位の前に入れた値は、読み戻すと段落の文字に出る', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${P('（第四面）')}${P('  【ｲ.地階を除く階数】 階')}</w:body></w:document>`
    const bytes = buildZip([{ path: 'word/document.xml', data: new TextEncoder().encode(xml) }])
    const out = await fillDocx(bytes, [{ paragraphIndex: 1, kind: 'beforeUnit', heading: '【ｲ.地階を除く階数】', unit: '階', value: '5' }])
    const back = await readDocx(out)
    expect(back.paragraphs).toEqual(['（第四面）', '  【ｲ.地階を除く階数】5階'])
  })
})
