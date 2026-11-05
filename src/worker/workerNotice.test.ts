// 仕様（代表の決定 G154。統括の依頼 2026-11-05「Claude を呼ぶボタンの、Worker が無いときの見せ方」。決定は B）:
// Worker の URL が無いとき、またはつながらないときも、ボタンは押せる。押したら「未接続」か「つながらない」の一行を画面に出す（A の「送れない」だけにはしない）。
// 仕様 1（URL が無い）: 判定は送らず、状態は unset。画面には未接続の一行。
// 仕様 2（つながらない）: 届かない（fetch が失敗する）ときは、保留にせず unreachable。画面には「Worker につながりません」の一行。
// 仕様 3（失敗の応答）: Worker が 500 などを返したら、今までどおり保留（pending）。
// 仕様 4（機能オフ）: 意味づけ（Claude）が切れているときは、今までどおり unconnected。
// 仕様 5（条例の補完）: 届かないときは WorkerUnreachableError。
// 仕様 6（文言）: 届かないときの一行は、チャットの注記（UNREACHABLE_NOTICE）と同じ文言。
import { describe, expect, it } from 'vitest'
import { judgeSegments, judgeText } from './judge'
import { WORKER_UNREACHABLE_NOTICE, WORKER_UNSET_NOTICE } from './notices'
import { WorkerUnreachableError } from './client'
import { suggestOrdinanceViaWorker } from './ordinanceClient'
import { UNREACHABLE_NOTICE } from '../store/chat'

const seg = [{ id: 's1', a: { x: 0, y: 0 }, b: { x: 1000, y: 0 } }]
const sinks = () => {
  const pending: string[] = []
  return {
    pending,
    suggest: () => undefined,
    addPending: (e: string) => pending.push(e),
  }
}

describe('Claude を呼ぶボタンの見せ方（仕様 1〜4）', () => {
  it('仕様 1: Worker の URL が無ければ、送らずに unset。画面には未接続の一行', async () => {
    const s = sinks()
    const out = await judgeSegments({ segments: seg, workerUrl: '', enabled: true, fetchImpl: async () => new Response('{}') }, s)
    expect(out.state).toBe('unset')
    expect(s.pending).toHaveLength(0)
    expect(judgeText(out)).toBe(WORKER_UNSET_NOTICE)
  })

  it('仕様 2: 届かない（fetch が失敗する）ときは、保留にせず unreachable。画面には「つながりません」の一行', async () => {
    const s = sinks()
    const fetchImpl = async (): Promise<Response> => {
      throw new TypeError('Failed to fetch')
    }
    const out = await judgeSegments({ segments: seg, workerUrl: 'https://w.example', enabled: true, fetchImpl }, s)
    expect(out.state).toBe('unreachable')
    expect(s.pending).toHaveLength(0)
    expect(judgeText(out)).toBe(WORKER_UNREACHABLE_NOTICE)
  })

  it('仕様 3: Worker が 500 を返したら、今までどおり保留（pending）', async () => {
    const s = sinks()
    const fetchImpl = async (): Promise<Response> => new Response('{}', { status: 500 })
    const out = await judgeSegments({ segments: seg, workerUrl: 'https://w.example', enabled: true, fetchImpl }, s)
    expect(out.state).toBe('pending')
    expect(s.pending.length).toBe(1)
  })

  it('仕様 4: 意味づけ（Claude）が切れているときは、今までどおり unconnected', async () => {
    const out = await judgeSegments({ segments: seg, workerUrl: 'https://w.example', enabled: false, fetchImpl: async () => new Response('{}') }, sinks())
    expect(out.state).toBe('unconnected')
  })
})

describe('条例の補完の届かない失敗（仕様 5・6）', () => {
  const req = { city: '江東区', zone: '住居系' as const, text: '日影の条文' }

  it('仕様 5: 届かない（fetch が失敗する）ときは、WorkerUnreachableError', async () => {
    const fetchImpl = async (): Promise<Response> => {
      throw new TypeError('Failed to fetch')
    }
    await expect(suggestOrdinanceViaWorker(req, 'https://worker.example.dev', fetchImpl)).rejects.toBeInstanceOf(WorkerUnreachableError)
  })

  it('仕様 6: 届かないときの一行は、チャットの注記と同じ文言', () => {
    expect(WORKER_UNREACHABLE_NOTICE).toBe(UNREACHABLE_NOTICE)
  })
})
