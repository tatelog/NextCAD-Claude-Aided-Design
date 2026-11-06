// 仕様（統括の判断 2026-11-06。新築なので申請部分と合計に同じ値）: 同じ段落の 1 番目（申請部分）と 3 番目（合計）の両方に入る。
// SP1: 1 番目を書いたあとでも、3 番目の括弧の番号はずれない（書いた括弧は空白でなくなるので、番号の大きい方から書く）。
import { describe, expect, it } from 'vitest'
import { buildZip } from './zipWriter'
import { readDocx } from './docxRead'
import { fillDocx } from './docxWrite'

const P = (text: string) => `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`
const DOC = (body: string) => `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`

describe('同じ段落の 2 つの括弧（仕様 SP1）', () => {
  it('SP1: 申請部分（1 番目）と合計（3 番目）の両方に、同じ値が入る', async () => {
    const xml = DOC(P('第二号様式') + P('  【ｲ.建築物全体】(　　　)(　　　)(　　　)'))
    const bytes = buildZip([{ path: 'word/document.xml', data: new TextEncoder().encode(xml) }])
    const out = await fillDocx(bytes, [
      { paragraphIndex: 1, kind: 'blanks', bracket: 0, value: '400.00' },
      { paragraphIndex: 1, kind: 'blanks', bracket: 2, value: '400.00' },
    ])
    const back = await readDocx(out)
    expect(back.paragraphs[1]).toBe('  【ｲ.建築物全体】(400.00)(　　　)(400.00)')
  })
})
