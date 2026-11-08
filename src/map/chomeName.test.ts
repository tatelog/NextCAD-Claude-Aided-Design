// 仕様（統括の依頼 2026-11-06。江東区の一覧の「丁目が未確認」を、選んだ筆の丁目で解く）:
// CH1: 大字名と丁目名（「２丁目」）から、丁目の名前（漢数字）を作る。625-1 は「新砂二丁目」。
// CH2: 大字名か丁目名が無いときは null（丁目が分からない）。
// CH3: 作った丁目の名前で江東区の一覧を引く。新砂二丁目は一覧に当たらないので、「丁目が未確認」ではなく全域の規定になる。
import { describe, expect, it } from 'vitest'
import { chomeNameOf } from './parcelInfo'
import { koutoAreaOf } from '../law/shadowKotoAreas'

const P625_1 = { 地図名: '13108_2014_1', 地番: '625-1', 大字名: '新砂', 丁目名: '２丁目', 市区町村名: '江東区' }

describe('丁目の名前（仕様 CH1〜CH3）', () => {
  it('CH1: 大字名と丁目名（２丁目）から「新砂二丁目」を作る', () => {
    expect(chomeNameOf(P625_1)).toBe('新砂二丁目')
  })

  it('CH2: 丁目名が無いときは null', () => {
    expect(chomeNameOf({ 大字名: '新砂', 地番: '1' })).toBeNull()
    expect(chomeNameOf({ 丁目名: '２丁目', 地番: '1' })).toBeNull()
  })

  it('CH3: 作った丁目の名前で江東区の一覧を引く。新砂二丁目は一覧に当たらず、全域の規定になる（丁目が未確認ではない）', () => {
    expect(koutoAreaOf(chomeNameOf(P625_1)).kind).toBe('general')
  })
})
