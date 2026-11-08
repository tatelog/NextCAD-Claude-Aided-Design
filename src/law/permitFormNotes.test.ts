// 仕様（統括の依頼 2026-11-06。書けなかった欄を、黙って抜かず、空欄の一覧に出す）:
// UW1: 取り込んだ様式で書けなかった欄は、空欄の一覧の行になる（欄の名前・様式・理由）。書けた欄は出ない。
// UW2: 様式の段落が無い（面が見つからない）欄も、同じく出る。
// SL1: 細目の名前は、東京都の版の見出し（【ﾆ.】構造】）でも「構造」になる（記入の一覧と、書く行き先で同じ名前）。
import { describe, expect, it } from 'vitest'
import { unwrittenNotesOf } from './permitFormNotes'
import { subLabelOf } from './permitFormPlan'

describe('書けなかった欄は空欄の一覧に出る（仕様 UW1・UW2）', () => {
  it('UW1・UW2: 段落が無い第四面の床面積は、「書けなかった」の行で出る（様式の名前つき）', () => {
    const lines = unwrittenNotesOf({ F2: { paragraphs: ['（第二面）', '【1.地名地番】'] } }, { 'F2-4-12': { value: '3000.00', from: 'ボリューム' } })
    expect(lines.some((l) => l.includes('床面積') && l.includes('書けなかった') && l.includes('第二号様式'))).toBe(true)
  })

  it('UW1: 書けた欄は、書けなかった欄の行に出ない', () => {
    const lines = unwrittenNotesOf({ F2: { paragraphs: ['（第三面）', '【1.地名地番】'] } }, { 'F2-3-01': { value: '江東区新砂二丁目625番1', from: '公図' } })
    expect(lines).toEqual([])
  })
})

describe('細目の名前（仕様 SL1）', () => {
  it('SL1: 東京都の版の見出し【ﾆ.】構造】の名前は「構造」', () => {
    expect(subLabelOf('【ﾆ.】構造】')).toBe('構造')
  })

  it('SL1: 通常の見出し【ﾊ.構造】の名前も「構造」', () => {
    expect(subLabelOf('【ﾊ.構造】')).toBe('構造')
  })
})
