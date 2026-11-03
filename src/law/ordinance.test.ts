// 仕様（ハブ A-03 G15・D-02 C4「条例の補完（W4）」・完了条件）: 条例の値（日影の条件など）は、人が出典つきで入力し、人が確認して初めて確かめられた値になる。確認していない値は判定に使わない。
// 仕様 1: 入力が無い項目は「未入力」。値を入れただけなら「未確認」。
// 仕様 2: 確認は、出典が空でないときだけできる。確認すると「確認済み」になる。
// 仕様 3: 判定に使える値は「確認済み」だけ。未確認・未入力の項目の判定は「判定不能」。
// 仕様 4: 同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { ordinanceStatus, judgeWithOrdinance, type OrdinanceEntry } from './ordinance'

const none: OrdinanceEntry[] = []
const typed: OrdinanceEntry[] = [{ key: '日影時間', value: '4時間', source: '東京都条例 別表第四', confirmed: false }]
const confirmed: OrdinanceEntry[] = [{ key: '日影時間', value: '4時間', source: '東京都条例 別表第四', confirmed: true }]

describe('条例の値の確認（仕様 1〜4）', () => {
  it('仕様 1: 入力が無ければ未入力、値を入れただけなら未確認', () => {
    expect(ordinanceStatus(none, '日影時間')).toEqual({ status: '未入力' })
    expect(ordinanceStatus(typed, '日影時間')).toEqual({ status: '未確認', value: '4時間' })
  })

  it('仕様 2: 確認は出典が空でないときだけ。確認すると確認済み', () => {
    expect(ordinanceStatus(confirmed, '日影時間')).toEqual({ status: '確認済み', value: '4時間' })
    const noSource: OrdinanceEntry[] = [{ key: '日影時間', value: '4時間', source: '', confirmed: true }]
    expect(ordinanceStatus(noSource, '日影時間').status).toBe('未確認')
  })

  it('仕様 3: 判定は確認済みだけで行い、ほかは判定不能', () => {
    expect(judgeWithOrdinance(confirmed, '日影時間', (v) => `判定 ${v}`)).toBe('判定 4時間')
    expect(judgeWithOrdinance(typed, '日影時間', (v) => `判定 ${v}`)).toBe('判定不能（条例の値が未確認）')
    expect(judgeWithOrdinance(none, '日影時間', (v) => `判定 ${v}`)).toBe('判定不能（条例の値が未入力）')
  })

  it('仕様 4: 同じ入力には同じ出力で、入力を書き換えない', () => {
    expect(ordinanceStatus(confirmed, '日影時間')).toEqual(ordinanceStatus(confirmed, '日影時間'))
    expect(confirmed[0]!.confirmed).toBe(true)
  })
})
