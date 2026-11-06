// 仕様（第三号の取り込み 2026-11-06）: 第三号の面の見出しは「建築計画概要書（第二面）」の形。面の見出しは、段落の末尾が（第○面）の行だけ。
// FT1: 「建築計画概要書（第二面）」は、第二面の見出しになる（面の範囲が取れる）。
// FT2: 本文の中に（第二面）と書いてあるだけの段落（注意書き）は、面の見出しにならない。
import { describe, expect, it } from 'vitest'
import { faceRangesOf } from './permitFormPlan'

describe('面の見出し（仕様 FT1・FT2）', () => {
  it('FT1: 「建築計画概要書（第二面）」の行で、第二面の範囲が取れる', () => {
    const paragraphs = ['建築計画概要書（第一面）', '【1.建築主】', '建築計画概要書（第二面）', '【1.地名地番】', '建築計画概要書（第三面）', '【1.付近】']
    const ranges = faceRangesOf(paragraphs, ['第一面', '第二面', '第三面'])
    expect(ranges.get('第二面')).toEqual([3, 4])
  })

  it('FT2: 本文の中の（第二面）は、面の見出しにならない', () => {
    const paragraphs = ['建築計画概要書（第二面）', '【1.地名地番】', '①　建築計画概要書（第二面）の写しに代えることができます。', '【2.住居表示】']
    const ranges = faceRangesOf(paragraphs, ['第二面'])
    expect(ranges.get('第二面')).toEqual([1, 4])
  })
})
