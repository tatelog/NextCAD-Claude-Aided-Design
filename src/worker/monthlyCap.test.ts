// 仕様（ハブ A-03 G29・D-02 C12・D-06 N7。費用の月あたりの上限）: Claude を呼ぶ件数を、月ごとに数え、上限に達したら呼ばない。
// 数える置き場は、Cloudflare の KV（USAGE）。利用者が KV を作って結び付けたときだけ効く（置き場が無ければ月の上限は効かない）。
// 仕様 1: 月の件数が上限より少なければ通し、件数を 1 増やす。
// 仕様 2: 上限に達していれば 'over'（呼ばない）。件数は増やさない。
// 仕様 3: 月が変わると、件数は 0 から数える（キーに年・月を含む）。
// 仕様 4: 置き場（USAGE）が無ければ、月の上限は効かない（いつも 'ok'）。
import { describe, expect, it } from 'vitest'
import { admitMonthly, monthKey, type KvLike } from './monthlyCap'

function memoryKv(): KvLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    async get(key: string) {
      return data.get(key) ?? null
    },
    async put(key: string, value: string) {
      data.set(key, value)
    },
  }
}

const NOV = new Date('2026-11-04T03:00:00.000Z')
const DEC = new Date('2026-12-01T03:00:00.000Z')

describe('費用の月上限（仕様 1〜4）', () => {
  it('仕様 1: 上限より少なければ通し、件数を 1 増やす', async () => {
    const kv = memoryKv()
    expect(await admitMonthly(kv, NOV, 2)).toBe('ok')
    expect(kv.data.get(monthKey(NOV))).toBe('1')
  })

  it('仕様 2: 上限に達していれば over。件数は増やさない', async () => {
    const kv = memoryKv()
    await admitMonthly(kv, NOV, 1)
    expect(await admitMonthly(kv, NOV, 1)).toBe('over')
    expect(kv.data.get(monthKey(NOV))).toBe('1')
  })

  it('仕様 3: 月が変われば 0 から数える', async () => {
    const kv = memoryKv()
    await admitMonthly(kv, NOV, 1)
    expect(monthKey(DEC)).not.toBe(monthKey(NOV))
    expect(await admitMonthly(kv, DEC, 1)).toBe('ok')
  })

  it('仕様 4: 置き場が無ければ、いつも ok', async () => {
    expect(await admitMonthly(undefined, NOV, 0)).toBe('ok')
  })
})
