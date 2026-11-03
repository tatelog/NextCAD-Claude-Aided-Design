// 仕様: 作業履歴（モックのヘッダーの「作業履歴」）。画面の切り替え・保存・表示の切り替えを、新しい順に残す。
// 仕様 1: 新しい項目を先頭に入れる。
// 仕様 2: 上限（既定 200 件）を超えたら、古いものから捨てる。
// 仕様 3: 項目は時刻・画面・操作・対象を持つ（SQLite への保存は未接続。ここでは画面内だけ）。
import { describe, expect, it } from 'vitest'
import { appendLog, type LogEntry } from './workLog'

const e = (n: number): LogEntry => ({ at: `2026-11-03T00:00:${String(n).padStart(2, '0')}Z`, screen: 'P2', action: '切替', target: `${n}` })

describe('appendLog（作業履歴）', () => {
  it('新しい項目を先頭に入れる', () => {
    const log = appendLog([e(1)], e(2))
    expect(log.map((x) => x.target)).toEqual(['2', '1'])
  })

  it('上限を超えたら古いものから捨てる', () => {
    let log: LogEntry[] = []
    for (let i = 1; i <= 5; i++) log = appendLog(log, e(i), 3)
    expect(log.map((x) => x.target)).toEqual(['5', '4', '3'])
  })

  it('既定の上限は 200 件', () => {
    let log: LogEntry[] = []
    for (let i = 1; i <= 201; i++) log = appendLog(log, e(i))
    expect(log).toHaveLength(200)
    expect(log[0]!.target).toBe('201')
  })
})
