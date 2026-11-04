// 仕様（ハブ A-03 G11・G10。練習の結果を案ごとに保存し、G10 の閾値を測る素材にする）:
// 仕様 1: 結果の記録は、案の番号・許容差（mm）・正解の本数・描いた本数・再現率・適合率を持つ。
// 仕様 2: 許容差は既定 50 mm（仮置き）。
// 仕様 3: 記録の一覧は、案の番号の順に並べて JSON に書き出す。読み戻すと同じ記録に戻る。
// 仕様 4: 練習の線は作業ログ（T-06）に残さず、Claude の意味づけ（W1）も呼ばない（この部品は純粋な計算だけ）。
// 仕様 5: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { practiceRecordOf, recordsToJson } from './resultRecord'

const truth = [
  { a: { x: 0, y: 0 }, b: { x: 6000, y: 0 } },
  { a: { x: 3000, y: 0 }, b: { x: 3000, y: 6000 } },
]

describe('記録の中身（仕様 1〜2）', () => {
  it('完全に一致した描き方は、再現率も適合率も 1、許容差は既定の 50 mm', () => {
    const r = practiceRecordOf('田の字-01', truth, truth)
    expect(r).toEqual({ caseId: '田の字-01', tolMm: 50, truthCount: 2, drawnCount: 2, recall: 1, precision: 1 })
  })

  it('半分だけ描いた描き方は、再現率 0.5、適合率 1', () => {
    const r = practiceRecordOf('田の字-02', truth, [truth[0]!])
    expect(r.recall).toBe(0.5)
    expect(r.precision).toBe(1)
  })
})

describe('JSON への書き出し（仕様 3）', () => {
  it('案の番号の順に並び、読み戻すと同じ記録になる', () => {
    const b = practiceRecordOf('田の字-02', truth, [truth[0]!])
    const a = practiceRecordOf('田の字-01', truth, truth)
    const json = recordsToJson([b, a])
    expect(JSON.parse(json).map((x: { caseId: string }) => x.caseId)).toEqual(['田の字-01', '田の字-02'])
    expect(JSON.parse(json)).toEqual([a, b])
  })
})

describe('同じ入力（仕様 5）', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const drawn = [truth[0]!]
    const before = JSON.stringify(drawn)
    expect(practiceRecordOf('x', truth, drawn)).toEqual(practiceRecordOf('x', truth, drawn))
    expect(JSON.stringify(drawn)).toBe(before)
  })
})
