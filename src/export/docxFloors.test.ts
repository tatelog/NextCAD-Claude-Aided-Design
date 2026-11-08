// 仕様（統括の依頼 2026-11-06。8: 各階の床面積）。東京都の版の階別の行: （　階）と、括弧 3 つ（申請部分・申請以外の部分・合計）。
// FLD1: 行の「（　階）」の空白に、階の番号を入れる（括弧の中の「階」は残す）。
// FLD2: その行の 3 つ目の括弧（合計）に面積を入れる。
// 実際の段落の形（【ｲ.階別】の行）を写して試験する。
import { describe, expect, it } from 'vitest'
import { beforeUnitInParagraph, fillBlanksInParagraph } from './docxWrite'

const runs = (texts: string[]) => `<w:p>${texts.map((t) => `<w:r><w:t xml:space="preserve">${t}</w:t></w:r>`).join('')}</w:p>`
const textOf = (xml: string) => [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('')

describe('各階の床面積の行（仕様 FLD1・FLD2）', () => {
  it('FLD1・FLD2: 見出しの行（【ｲ.階別】）の（　階）に階の番号、3 つ目の括弧に面積', () => {
    const p = runs(['  【', 'ｲ', '.階別】 (    階)    (               ) (               ) (               )'])
    const withFloor = beforeUnitInParagraph(p, '【ｲ.階別】', '階', '5')
    expect(textOf(withFloor)).toBe('  【ｲ.階別】 (5階)    (               ) (               ) (               )')
    expect(textOf(fillBlanksInParagraph(withFloor, 2, '400.00'))).toBe('  【ｲ.階別】 (5階)    (               ) (               ) (400.00)')
  })

  it('FLD1・FLD2: 次の行（見出しの無い行）も、同じ形で入る', () => {
    const p = runs(['             (    階)    (               ) (               ) (               )'])
    const withFloor = beforeUnitInParagraph(p, '', '階', '4')
    expect(textOf(fillBlanksInParagraph(withFloor, 2, '380.00'))).toBe('             (4階)    (               ) (               ) (380.00)')
  })
})
