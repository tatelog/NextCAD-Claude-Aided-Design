// 仕様: ブラウザ側の中継の呼び出し（D-02 C12、A-03 G29・G31）。ブラウザは Claude の API を直接呼ばず、Worker の URL へ送る。
// 仕様 1: Worker の URL は引数で受ける（配備先は未決）。空の URL は弾く。
// 仕様 2: POST {url}/classify に、線分（id・mm 座標）を JSON で送る。キーはブラウザに持たない（本文・ヘッダーに含めない）。
// 仕様 3: 応答は parseClassifierOutput で検証して返す。
// 仕様 4（G31）: 失敗（通信・スキーマ外）は 1 回だけ再試行し、それでも失敗なら保留（PENDING）。
import { describe, expect, it } from 'vitest'
import { classifyViaWorker } from './client'
import { PENDING } from './classify'

const segments = [{ id: 's1', a: { x: 0, y: 0 }, b: { x: 5_000, y: 0 } }]
const ok = { segments: [{ segment_id: 's1', kind: 'wall', confidence: 0.9 }] }

function fakeFetch(responses: { ok: boolean; body: unknown }[]) {
  const calls: { url: string; init: RequestInit }[] = []
  let i = 0
  const fetchImpl = async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    const r = responses[Math.min(i, responses.length - 1)]!
    i++
    return new Response(JSON.stringify(r.body), { status: r.ok ? 200 : 500, headers: { 'content-type': 'application/json' } })
  }
  return { fetchImpl, calls }
}

describe('classifyViaWorker', () => {
  it('URL が空なら弾く', async () => {
    const { fetchImpl, calls } = fakeFetch([{ ok: true, body: ok }])
    await expect(classifyViaWorker(segments, '', fetchImpl)).rejects.toThrow()
    expect(calls).toHaveLength(0)
  })

  it('POST で {url}/classify に線分を送り、本文にキーを含めない', async () => {
    const { fetchImpl, calls } = fakeFetch([{ ok: true, body: ok }])
    await classifyViaWorker(segments, 'https://worker.example.invalid', fetchImpl)
    expect(calls[0]!.url).toBe('https://worker.example.invalid/classify')
    expect(calls[0]!.init.method).toBe('POST')
    const body = JSON.parse(String(calls[0]!.init.body))
    expect(body.segments).toEqual(segments)
    expect(JSON.stringify(calls[0]!.init)).not.toMatch(/api[-_]?key/i)
  })

  it('応答を検証して返す', async () => {
    const { fetchImpl } = fakeFetch([{ ok: true, body: ok }])
    const out = await classifyViaWorker(segments, 'https://worker.example.invalid', fetchImpl)
    expect(out).toEqual(ok.segments)
  })

  it('失敗は 1 回だけ再試行し、二回とも失敗なら保留（PENDING）', async () => {
    const { fetchImpl, calls } = fakeFetch([{ ok: false, body: {} }, { ok: false, body: {} }])
    await expect(classifyViaWorker(segments, 'https://worker.example.invalid', fetchImpl)).rejects.toMatchObject({ code: PENDING })
    expect(calls).toHaveLength(2)
  })
})
