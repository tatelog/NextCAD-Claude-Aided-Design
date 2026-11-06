// 仕様（統括の依頼 2026-11-06。実データの確かめで見つけた不一致: 用途地域の欄は「住居系」を示すのに、計算は PLATEAU の「準工・工業系」を使っていた）:
// 仕様 ZS1: PLATEAU（敷地）で用途地域が一つに決まっているときは、欄はその区分を示し、押せない（計算はその区分を使う）。
// 仕様 ZS2: 区分が決まらないときは、欄は利用者の入力を示し、押せる（計算も利用者の入力を使う）。
import { describe, expect, it } from 'vitest'
import { zoneSelectStateOf } from './siteRule'

describe('用途地域の欄（仕様 ZS1・ZS2）', () => {
  it('仕様 ZS1: PLATEAU の区分が決まっていれば、欄はその区分を示し、押せない', () => {
    expect(zoneSelectStateOf({ zone: '準工・工業系', farPercent: 200 }, '住居系')).toEqual({ value: '準工・工業系', disabled: true })
  })

  it('仕様 ZS2: PLATEAU の区分が決まらなければ（敷地が無い・複数）、欄は利用者の入力を示し、押せる', () => {
    expect(zoneSelectStateOf(null, '住居系')).toEqual({ value: '住居系', disabled: false })
  })
})
