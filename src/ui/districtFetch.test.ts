// 仕様（統括の依頼 2026-11-06。1: 筆が選ばれたら、その地点の用途地域を自動で取る。取り直しボタンは残す）:
// 仕様 1a: 取っている間は「用途地域を取得中」と出す。
// 仕様 1b: 取れなかったら「用途地域を取れなかった（ボタンで取り直す）」と出す。
// 仕様 1c: 取得中でも失敗でもなければ、何も出さない。
// 仕様 1d: 続けて取り直したら、前の取得の結果は、後から返っても採らない（最新の一回だけ採る）。
import { describe, expect, it } from 'vitest'
import { createLatestGate, districtStatusTextOf } from './districtFetch'

describe('用途地域の取得の状態の文言（仕様 1a〜1c）', () => {
  it('仕様 1a: 取得中は「用途地域を取得中」', () => {
    expect(districtStatusTextOf({ loading: true, error: null })).toBe('用途地域を取得中')
  })

  it('仕様 1b: 取れなかったら「用途地域を取れなかった（ボタンで取り直す）」', () => {
    expect(districtStatusTextOf({ loading: false, error: '通信に失敗' })).toBe('用途地域を取れなかった（ボタンで取り直す）')
  })

  it('仕様 1c: 取得中でも失敗でもなければ、何も出さない', () => {
    expect(districtStatusTextOf({ loading: false, error: null })).toBeNull()
  })
})

describe('古い取得の結果を採らない（仕様 1d）', () => {
  it('続けて取り直したら、前の番号は最新ではない。最新の番号だけが採られる', () => {
    const gate = createLatestGate()
    const first = gate.begin()
    const second = gate.begin()
    expect(gate.isLatest(first)).toBe(false)
    expect(gate.isLatest(second)).toBe(true)
  })
})
