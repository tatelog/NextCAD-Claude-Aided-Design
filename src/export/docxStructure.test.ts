// 仕様（統括の依頼 2026-11-06。構造の直し: 東京都の版の「造」の前の空白は、括弧ではなく、見出しの run の後ろの空白）:
// DX1: 見出しの後ろの空白（run が分かれていても）を、「造」の前で値に置き換える。造の文字は残す。
// 実際の段落の run の並び（見出しの run・造の run・一部の run）を、そのまま写して試験する。
import { describe, expect, it } from 'vitest'
import { beforeUnitInParagraph } from './docxWrite'

const runs = (texts: string[]) => `<w:p>${texts.map((t) => `<w:r><w:t xml:space="preserve">${t}</w:t></w:r>`).join('')}</w:p>`
const textOf = (xml: string) => [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('')

describe('構造の「造」の前（仕様 DX1）', () => {
  it('DX1: 第三面の【ﾊ.構造】（run が【・ﾊ・.構造】の順に分かれている）の「造」の前に、値が入る', () => {
    const p = runs(['  【', 'ﾊ', '.構造】                         ', '造', '    一部                  造'])
    expect(textOf(beforeUnitInParagraph(p, '【ﾊ.構造】', '造', '鉄筋コンクリート'))).toBe(
      '  【ﾊ.構造】鉄筋コンクリート造    一部                  造',
    )
  })

  it('DX1: 第四面の【4.構造】（見出しの run の中に空白）の「造」の前に、値が入る', () => {
    const p = runs(['【4.構造】                  ', '造', '    一部              造'])
    expect(textOf(beforeUnitInParagraph(p, '【4.構造】', '造', '鉄筋コンクリート'))).toBe('【4.構造】鉄筋コンクリート造    一部              造')
  })
})
