// 仕様（ハブ A-03 G11「練習セット」。代表の決定 2026-11-04）: 間取り収集の 39 案から、ランダムに 1 案を出題する。
// 仕様 1: 乱数（0 以上 1 未満）から案の番号を決める。0 は先頭、0.999… は末尾。
// 仕様 2: 案が無ければ出題できないので例外。
// 仕様 3: 案の配列を書き換えない。
// 仕様 4: 乱数は引数で渡すので、同じ乱数なら同じ出題（テストを決定論にする）。
import { describe, expect, it } from 'vitest'
import { pickPracticeCase } from './caseSelect'

const cases = ['a', 'b', 'c', 'd']

describe('乱数から案を選ぶ（仕様 1）', () => {
  it('乱数 0 は先頭、0.999 は末尾', () => {
    expect(pickPracticeCase(cases, () => 0)).toBe('a')
    expect(pickPracticeCase(cases, () => 0.999)).toBe('d')
  })

  it('境目: 乱数 0.25 は二番目（4 案の 1/4 ごと）', () => {
    expect(pickPracticeCase(cases, () => 0.25)).toBe('b')
    expect(pickPracticeCase(cases, () => 0.2499)).toBe('a')
  })
})

describe('案が無い（仕様 2）', () => {
  it('案が無ければ例外', () => {
    expect(() => pickPracticeCase([], () => 0.5)).toThrow()
  })
})

describe('書き換えない・同じ乱数（仕様 3〜4）', () => {
  it('案の配列を書き換えず、同じ乱数なら同じ出題', () => {
    const before = JSON.stringify(cases)
    expect(pickPracticeCase(cases, () => 0.6)).toBe(pickPracticeCase(cases, () => 0.6))
    expect(JSON.stringify(cases)).toBe(before)
  })
})
