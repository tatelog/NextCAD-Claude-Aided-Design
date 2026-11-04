// 仕様: PLATEAU の zip の範囲取得（Range）を、ブラウザから同じ接続元で中継する（CORS の事前確認で止まるため）。
// 仕様 1: /plateau-assets/<パス> への GET（Range 付き）を、PLATEAU の同じパスへ Range のまま中継する。
// 仕様 2: 中継の応答は、状態（206 など）・Content-Range・Content-Length を保つ。
// 仕様 3: 中継先は PLATEAU のホストだけ。別のパスは 404 にし、外へは一切取りに行かない（開いた中継にしない）。
// 仕様 4: GET と HEAD 以外は 405。
// 仕様 5: OPTIONS は 204 で、Range ヘッダを許す（接続元が許されている場合だけ CORS のヘッダーを返す）。
import { describe, expect, it } from 'vitest'
import { handleRequest, type Env } from './index'

const env: Env = { ANTHROPIC_API_KEY: 'unused-in-these-tests', ALLOWED_ORIGIN: 'https://app.example.test' }

function recordingFetch(status: number, body: Uint8Array, headers: Record<string, string>) {
  const calls: { url: string; range: string | undefined }[] = []
  const fetchImpl = async (url: string, init: RequestInit) => {
    const h = init.headers as Record<string, string> | undefined
    calls.push({ url, range: h?.Range })
    return new Response(new Blob([body as BlobPart]), { status, headers })
  }
  return { fetchImpl, calls }
}

describe('/plateau-assets（PLATEAU の範囲取得の中継）', () => {
  it('Range を同じパスで PLATEAU へ中継し、206 と Content-Range を返す', async () => {
    const { fetchImpl, calls } = recordingFetch(206, new Uint8Array([1, 2, 3]), {
      'content-range': 'bytes 0-2/100',
      'content-length': '3',
    })
    const res = await handleRequest(
      new Request('https://relay.example.test/plateau-assets/assets/55/x/13108.zip', { headers: { Range: 'bytes=0-2' } }),
      env,
      fetchImpl,
    )
    expect(calls).toEqual([{ url: 'https://assets.cms.plateau.reearth.io/assets/55/x/13108.zip', range: 'bytes=0-2' }])
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe('bytes 0-2/100')
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('許可していない接続元には CORS のヘッダーを付けない', async () => {
    const { fetchImpl } = recordingFetch(206, new Uint8Array([1]), {})
    const res = await handleRequest(
      new Request('https://relay.example.test/plateau-assets/a.zip', { headers: { Range: 'bytes=0-0', Origin: 'https://evil.example.test' } }),
      env,
      fetchImpl,
    )
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('許可した接続元には Access-Control-Allow-Origin を返す', async () => {
    const { fetchImpl } = recordingFetch(206, new Uint8Array([1]), {})
    const res = await handleRequest(
      new Request('https://relay.example.test/plateau-assets/a.zip', { headers: { Range: 'bytes=0-0', Origin: 'https://app.example.test' } }),
      env,
      fetchImpl,
    )
    expect(res.headers.get('access-control-allow-origin')).toBe('https://app.example.test')
  })

  it('プレフィックス外のパスは 404 で、外へは取りに行かない', async () => {
    const { fetchImpl, calls } = recordingFetch(200, new Uint8Array(), {})
    const res = await handleRequest(new Request('https://relay.example.test/other/a.zip'), env, fetchImpl)
    expect(res.status).toBe(404)
    expect(calls).toHaveLength(0)
  })

  it('POST は 405', async () => {
    const { fetchImpl, calls } = recordingFetch(200, new Uint8Array(), {})
    const res = await handleRequest(new Request('https://relay.example.test/plateau-assets/a.zip', { method: 'POST' }), env, fetchImpl)
    expect(res.status).toBe(405)
    expect(calls).toHaveLength(0)
  })

  it('OPTIONS は 204 で、Range を許す', async () => {
    const { fetchImpl } = recordingFetch(200, new Uint8Array(), {})
    const res = await handleRequest(
      new Request('https://relay.example.test/plateau-assets/a.zip', {
        method: 'OPTIONS',
        headers: { Origin: 'https://app.example.test', 'Access-Control-Request-Headers': 'range' },
      }),
      env,
      fetchImpl,
    )
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-headers')).toContain('range')
  })
})
