// 仕様（統括の依頼 2026-11-06。2-c: 欄の見出しの後ろ・括弧の中に値を入れて、docx を書き出す）:
// WR1: 表の外の段落の範囲（XML の位置）と、段落の文字は、読むときと同じ並び・同じ内容。
// WR2: 見出しの後ろの空白を、値に置き換える（見出しの文字は残す）。
// WR3: 括弧（（　）や(　)）は、指定した番目の括弧の中に値を入れる（ほかの括弧は残す）。
// WR4: 値に & < > があっても、XML として壊れない。
// WR5: 記入した docx は、読み戻すと、書いた段落の文字が変わり、ほかの段落は変わらない。
import { describe, expect, it } from 'vitest'
import { buildZip } from './zipWriter'
import { readDocx } from './docxRead'
import { fillBlanksInParagraph, fillDocx, paragraphSpansOf, replaceAfterHeadingInParagraph } from './docxWrite'

const P = (text: string) => `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`
const DOC = (body: string) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`

describe('段落の範囲と文字（仕様 WR1）', () => {
  it('WR1: 表の外の段落だけを、読むときと同じ順・同じ文字で取る', () => {
    const xml = DOC(P('第二号様式') + '<w:tbl><w:tr><w:tc>' + P('表の中') + '</w:tc></w:tr></w:tbl>' + P('【ﾛ.氏名】　　　'))
    const spans = paragraphSpansOf(xml)
    expect(spans.map((s) => s.text)).toEqual(['第二号様式', '【ﾛ.氏名】　　　'])
    expect(xml.slice(spans[1]!.start, spans[1]!.end)).toContain('【ﾛ.氏名】')
  })
})

describe('見出しの後ろに入れる（仕様 WR2）', () => {
  it('WR2: 見出しの後ろの空白を値に置き換え、見出しは残す', () => {
    const p = P('【ﾛ.氏名】　　　')
    const out = replaceAfterHeadingInParagraph(p, '【ﾛ.氏名】', '山田太郎')
    expect(out).toContain('【ﾛ.氏名】')
    expect(out).toContain('山田太郎')
    expect(out).not.toContain('　　　')
  })
})

describe('括弧の中に入れる（仕様 WR3）', () => {
  it('WR3: 指定した番目の括弧の中に値を入れ、ほかの括弧は残す', () => {
    const p = P('【10.建築面積】　　(　　　)(　　　)(　　　)')
    const out = fillBlanksInParagraph(p, 2, '600.00')
    expect(out).toContain('(600.00)')
    expect(out.match(/\(　　　\)/g)?.length).toBe(2)
  })
})

describe('XML の特殊文字（仕様 WR4）', () => {
  it('WR4: 値の & < > を逃がして、XML として壊れないようにする', () => {
    const out = replaceAfterHeadingInParagraph(P('【ﾛ.氏名】　'), '【ﾛ.氏名】', 'A&B<C>')
    expect(out).toContain('A&amp;B&lt;C&gt;')
  })
})

describe('記入した docx（仕様 WR5）', () => {
  it('WR5: 書いた段落の文字だけが変わり、読み戻せる', async () => {
    const xml = DOC(P('第二号様式') + P('【ﾛ.氏名】　　　') + P('【ﾊ.郵便番号】　'))
    const bytes = buildZip([{ path: 'word/document.xml', data: new TextEncoder().encode(xml) }])
    const out = await fillDocx(bytes, [{ paragraphIndex: 1, kind: 'after', heading: '【ﾛ.氏名】', value: '山田太郎' }])
    const back = await readDocx(out)
    expect(back.paragraphs).toEqual(['第二号様式', '【ﾛ.氏名】山田太郎', '【ﾊ.郵便番号】　'])
  })
})
