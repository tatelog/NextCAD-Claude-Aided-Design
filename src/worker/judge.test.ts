// 仕様（ハブ A-03 G9・G14・G31、D-02 C12）: 線の意味づけを Worker に判定させ、結果は「提案（要確認）」として店舗に入れる。
// 仕様 1: 意味づけ（Claude）が切れているときは送らない（unconnected）。Worker の URL が空でも送らない。
// 仕様 2: 判定する線が 0 本なら送らない（skipped）。
// 仕様 3: 判定が返れば、線ごとに提案を入れる（applied）。提案は要確認・誰が＝Claude。
// 仕様 4: 2 回とも失敗したら保留に積む（pending）。提案は入れない。
// 仕様 5: 1 回目が失敗し 2 回目で返れば、提案を入れる（再試行は 1 回だけ）。
// 仕様 6: 人が確定した線は、Claude の提案で上書きしない。
import { beforeEach, describe, expect, it } from 'vitest'
import { judgeSegments, judgeText, type JudgeSinks } from './judge'
import { useSemantic } from '../store/semantic'

const segs = [{ id: 's1', a: { x: 0, y: 0 }, b: { x: 1000, y: 0 } }]

function fakeFetch(responses: Array<{ status: number; body: unknown }>, calls: string[]): typeof fetch {
  let i = 0
  return (async (url: string | URL | Request) => {
    calls.push(String(url))
    const r = responses[Math.min(i++, responses.length - 1)]!
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
}

const okBody = { segments: [{ segment_id: 's1', kind: 'wall', confidence: 0.9 }] }

function sinksOf(log: { suggested: Array<[string, string]>; pending: string[] }): JudgeSinks {
  return {
    suggest: (id, kind) => log.suggested.push([id, kind]),
    addPending: (error) => log.pending.push(error),
  }
}

describe('judgeSegments（判定の送り先と結果の反映）', () => {
  beforeEach(() => {
    useSemantic.getState().clear()
  })

  it('意味づけ（Claude）が切れているときは送らない', async () => {
    const calls: string[] = []
    const log = { suggested: [] as Array<[string, string]>, pending: [] as string[] }
    const out = await judgeSegments({ segments: segs, workerUrl: 'https://w.example.invalid', enabled: false, fetchImpl: fakeFetch([{ status: 200, body: okBody }], calls) }, sinksOf(log))
    expect(out.state).toBe('unconnected')
    expect(calls).toHaveLength(0)
  })

  it('Worker の URL が空のときは送らない', async () => {
    const calls: string[] = []
    const log = { suggested: [] as Array<[string, string]>, pending: [] as string[] }
    const out = await judgeSegments({ segments: segs, workerUrl: '  ', enabled: true, fetchImpl: fakeFetch([{ status: 200, body: okBody }], calls) }, sinksOf(log))
    expect(out.state).toBe('unconnected')
    expect(calls).toHaveLength(0)
  })

  it('判定する線が 0 本なら送らない（skipped）', async () => {
    const calls: string[] = []
    const log = { suggested: [] as Array<[string, string]>, pending: [] as string[] }
    const out = await judgeSegments({ segments: [], workerUrl: 'https://w.example.invalid', enabled: true, fetchImpl: fakeFetch([{ status: 200, body: okBody }], calls) }, sinksOf(log))
    expect(out.state).toBe('skipped')
    expect(calls).toHaveLength(0)
  })

  it('判定が返れば、線ごとに提案を入れる（applied）。提案は要確認・誰が＝Claude', async () => {
    const calls: string[] = []
    const log = { suggested: [] as Array<[string, string]>, pending: [] as string[] }
    const out = await judgeSegments({ segments: segs, workerUrl: 'https://w.example.invalid', enabled: true, fetchImpl: fakeFetch([{ status: 200, body: okBody }], calls) }, sinksOf(log))
    expect(out).toEqual({ state: 'applied', count: 1 })
    expect(log.suggested).toEqual([['s1', 'wall']])
    expect(log.pending).toHaveLength(0)
  })

  it('2 回とも失敗したら、保留に積む（pending）。提案は入れない', async () => {
    const calls: string[] = []
    const log = { suggested: [] as Array<[string, string]>, pending: [] as string[] }
    const out = await judgeSegments({ segments: segs, workerUrl: 'https://w.example.invalid', enabled: true, fetchImpl: fakeFetch([{ status: 500, body: {} }], calls) }, sinksOf(log))
    expect(out.state).toBe('pending')
    expect(calls).toHaveLength(2)
    expect(log.suggested).toHaveLength(0)
    expect(log.pending).toHaveLength(1)
    expect(log.pending[0]).toContain('保留')
  })

  it('1 回目が失敗し、2 回目で返れば、提案を入れる（再試行は 1 回）', async () => {
    const calls: string[] = []
    const log = { suggested: [] as Array<[string, string]>, pending: [] as string[] }
    const out = await judgeSegments(
      { segments: segs, workerUrl: 'https://w.example.invalid', enabled: true, fetchImpl: fakeFetch([{ status: 500, body: {} }, { status: 200, body: okBody }], calls) },
      sinksOf(log),
    )
    expect(out).toEqual({ state: 'applied', count: 1 })
    expect(calls).toHaveLength(2)
    expect(log.pending).toHaveLength(0)
  })
})

describe('判定の結果の文言（画面に出す）', () => {
  it('状態ごとに、何が起きたかが分かる文言になる', () => {
    expect(judgeText({ state: 'unconnected', reason: 'Worker の URL が未設定' })).toContain('Worker の URL が未設定')
    expect(judgeText({ state: 'skipped' })).toContain('判定する線が無い')
    expect(judgeText({ state: 'applied', count: 3 })).toContain('3 本')
    expect(judgeText({ state: 'pending', error: 'x' })).toContain('保留')
  })
})

describe('店舗への提案（仕様 3・6）', () => {
  beforeEach(() => {
    useSemantic.getState().clear()
  })

  it('提案は要確認の Claude の割り当てになり、人が確定した線は上書きしない', () => {
    useSemantic.getState().setKind('h1', 'column')
    // 要確認の帯（0.5 以上 0.85 未満）。0.5 未満は決定により店舗に入らない（t69 の直し。G82）
    useSemantic.getState().suggest('c1', 'wall', 0.6)
    useSemantic.getState().suggest('h1', 'wall', 0.9)
    const a = useSemantic.getState().assignments
    expect(a.c1).toEqual({ kind: 'wall', status: 'needs_review', by: 'claude' })
    expect(a.h1).toEqual({ kind: 'column', status: 'confirmed', by: 'human' })
  })
})
