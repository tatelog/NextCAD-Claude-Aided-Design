// 仕様（ハブ A-03 G31・G32、D-04 共通部品「保留の一覧」）: Claude の応答が失敗した判定は「保留」として積む。作業は止めない。
// 仕様 1: 自動で 1 回だけ再試行する。1 回目で成功すれば、再試行しない（呼び出し 1 回）。
// 仕様 2: 1 回目が失敗し、再試行で成功すれば、成功を返す（呼び出し 2 回）。
// 仕様 3: 2 回とも失敗したら、失敗を返す（理由を含む）。3 回目はしない（呼び出し 2 回）。
// 仕様 4: 保留の一覧は、積むと件数が増え、外すと減る。件数は一覧の長さと一致する。
import { beforeEach, describe, expect, it } from 'vitest'
import { judgeWithOneRetry } from './pendingJudgments'
import { usePending } from '../store/pending'

describe('judgeWithOneRetry（自動の 1 回再試行）', () => {
  it('1 回目で成功すれば、再試行せず、成功を返す（呼び出し 1 回）', async () => {
    let calls = 0
    const r = await judgeWithOneRetry(async () => {
      calls++
      return '適合'
    })
    expect(r).toEqual({ ok: true, value: '適合' })
    expect(calls).toBe(1)
  })

  it('1 回目が失敗し、再試行で成功すれば、成功を返す（呼び出し 2 回）', async () => {
    let calls = 0
    const r = await judgeWithOneRetry(async () => {
      calls++
      if (calls === 1) throw new Error('一時的な失敗')
      return '不適合'
    })
    expect(r).toEqual({ ok: true, value: '不適合' })
    expect(calls).toBe(2)
  })

  it('2 回とも失敗したら、失敗を返し、理由を含む（呼び出し 2 回。3 回目はしない）', async () => {
    let calls = 0
    const r = await judgeWithOneRetry(async () => {
      calls++
      throw new Error(`応答なし ${calls}`)
    })
    expect(calls).toBe(2)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('応答なし 2')
  })
})

describe('保留の一覧（積む・外す・件数）', () => {
  beforeEach(() => {
    usePending.getState().clear()
  })

  it('積むと件数が増え、外すと減る。件数は一覧の長さと一致する', () => {
    const { add, remove } = usePending.getState()
    add({ id: 'j1', label: '斜線の判定', error: '応答なし', at: '2026-11-04T01:00:00.000Z' })
    add({ id: 'j2', label: '日影の判定', error: '応答なし', at: '2026-11-04T01:01:00.000Z' })
    expect(usePending.getState().items).toHaveLength(2)
    remove('j1')
    expect(usePending.getState().items.map((i) => i.id)).toEqual(['j2'])
  })
})
