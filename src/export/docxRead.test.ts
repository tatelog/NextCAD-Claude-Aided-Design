// 仕様（統括の依頼 2026-11-06。2-a）:
// W1: 取り込んだ docx から、表の外の段落の文字を、順番どおりに読む（表の中の段落は読まない）。
// W2: 段落の文字は、空白・全角半角をそろえて比べられる（見出しの照合に使う）。
import { describe, expect, it } from 'vitest'
import { buildZip } from './zipWriter'
import { normalizeLabel, readDocx } from './docxRead'

const DOC = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
<w:p><w:r><w:t>第二号様式</w:t></w:r></w:p>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>受付欄</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
<w:p><w:r><w:t>【ﾛ.氏名】</w:t></w:r><w:r><w:t>　　　</w:t></w:r></w:p>
</w:body></w:document>`

function docxOf(xml: string): Uint8Array {
  return buildZip([{ path: 'word/document.xml', data: new TextEncoder().encode(xml) }])
}

describe('docx の段落の読み（仕様 W1）', () => {
  it('W1: 表の外の段落だけを、順番どおりに読む', async () => {
    const d = await readDocx(docxOf(DOC))
    expect(d.paragraphs).toEqual(['第二号様式', '【ﾛ.氏名】　　　'])
    expect(d.tableCount).toBe(1)
  })
})

describe('見出しの正規化（仕様 W2）', () => {
  it('W2: 空白と全角半角をそろえて比べる（【ﾛ.氏名】 と 【ロ.氏名】 は同じ）', () => {
    expect(normalizeLabel('【ﾛ.氏名】')).toBe(normalizeLabel('【ロ.氏名】'))
    expect(normalizeLabel('建 築 計 画 概 要 書')).toBe('建築計画概要書')
    expect(normalizeLabel(' 申請者氏名　 ')).toBe('申請者氏名')
  })
})
