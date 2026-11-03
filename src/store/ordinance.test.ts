// 仕様（ハブ A-03 G15）: 条例の値（出典つき）を画面の中で持つ。確認は出典が空でないときだけ。
// 仕様 1: 入力すると、その項目の値と出典が入り、確認は外れている。
// 仕様 2: 確認すると、出典が空でなければ確認済みになる。出典が空なら確認できない。
// 仕様 3: 項目を消すと、その項目だけ無くなる。
import { beforeEach, describe, expect, it } from 'vitest'
import { useOrdinance } from './ordinance'

beforeEach(() => useOrdinance.getState().reset())

describe('条例の値の店舗（仕様 1〜3）', () => {
  it('仕様 1: 入力すると、値と出典が入り、確認は外れている', () => {
    useOrdinance.getState().setEntry('日影時間', '4時間', '東京都条例 別表第四')
    expect(useOrdinance.getState().entries).toEqual([{ key: '日影時間', value: '4時間', source: '東京都条例 別表第四', confirmed: false }])
  })

  it('仕様 2: 出典が空なら確認できず、あれば確認できる', () => {
    useOrdinance.getState().setEntry('日影時間', '4時間', '')
    useOrdinance.getState().confirm('日影時間')
    expect(useOrdinance.getState().entries[0]!.confirmed).toBe(false)
    useOrdinance.getState().setEntry('日影時間', '4時間', '東京都条例')
    useOrdinance.getState().confirm('日影時間')
    expect(useOrdinance.getState().entries[0]!.confirmed).toBe(true)
  })

  it('仕様 3: 項目を消すと、その項目だけ無くなる', () => {
    useOrdinance.getState().setEntry('日影時間', '4時間', '条例')
    useOrdinance.getState().setEntry('測定面の高さ', '4m', '条例')
    useOrdinance.getState().clear('日影時間')
    expect(useOrdinance.getState().entries.map((e) => e.key)).toEqual(['測定面の高さ'])
  })
})
