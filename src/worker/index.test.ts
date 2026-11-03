// 仕様: Worker の受け口（D-02 C12、A-03 G29・G31）。Cloudflare Worker で動かす。配備先は利用者の Cloudflare アカウント。
// 仕様 1: POST /classify に {segments} を送ると、判定結果を {segments} で返す（200）。
// 仕様 2: POST 以外は 405。/classify 以外のパスは 404。
// 仕様 3: JSON が壊れている、または線分の形が違えば 400。Claude は呼ばない。
// 仕様 4（G31）: 判定が保留（PENDING）なら 503 と code を返す。その他の失敗は 500 で、キーなどの中身は返さない。
// 仕様 5: CORS。ALLOWED_ORIGIN が設定されていれば、その値だけを許す。OPTIONS は 204。
import { describe, expect, it } from 'vitest'
import { handleRequest } from './index'

const segs = [{ id: 's1', a: { x: 0, y: 0 }, b: { x: 5_000, y: 0 } }]
const good = { content: [{ type: 'tool_use', name: 'classify_segments', input: { segments: [{ segment_id: 's1', kind: 'wall', confidence: 0.9 }] } }] }

function req(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://worker.example.invalid${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function apiFetch(ok: boolean, body: unknown) {
  const calls: RequestInit[] = []
  const f = async (_url: string, init: RequestInit) => {
    calls.push(init)
    return new Response(JSON.stringify(body), { status: ok ? 200 : 500, headers: { 'content-type': 'application/json' } })
  }
  return { f, calls }
}

const env = { ANTHROPIC_API_KEY: 'k-not-real' }

describe('Worker の受け口', () => {
  it('POST /classify は判定結果を segments で返す', async () => {
    const { f } = apiFetch(true, good)
    const res = await handleRequest(req('POST', '/classify', { segments: segs }), env, f)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ segments: [{ segment_id: 's1', kind: 'wall', confidence: 0.9 }] })
  })

  it('POST 以外は 405、/classify 以外は 404', async () => {
    const { f } = apiFetch(true, good)
    expect((await handleRequest(req('GET', '/classify'), env, f)).status).toBe(405)
    expect((await handleRequest(req('POST', '/other', { segments: segs }), env, f)).status).toBe(404)
  })

  it('JSON が壊れていれば 400 で、Claude は呼ばない', async () => {
    const { f, calls } = apiFetch(true, good)
    const res = await handleRequest(req('POST', '/classify', '{not json'), env, f)
    expect(res.status).toBe(400)
    expect(calls).toHaveLength(0)
  })

  it('線分の形が違えば 400', async () => {
    const { f, calls } = apiFetch(true, good)
    const res = await handleRequest(req('POST', '/classify', { segments: [{ id: 's1' }] }), env, f)
    expect(res.status).toBe(400)
    expect(calls).toHaveLength(0)
  })

  it('判定が保留なら 503 と code（PENDING）を返す', async () => {
    const { f } = apiFetch(false, {})
    const res = await handleRequest(req('POST', '/classify', { segments: segs }), env, f)
    expect(res.status).toBe(503)
    expect(((await res.json()) as { code: string }).code).toBe('PENDING')
  })

  it('キーが無ければ 500。応答にキーなどの中身を出さない', async () => {
    const { f, calls } = apiFetch(true, good)
    const res = await handleRequest(req('POST', '/classify', { segments: segs }), {} as never, f)
    expect(res.status).toBe(500)
    expect(calls).toHaveLength(0)
    expect(await res.text()).not.toMatch(/k-not-real|ANTHROPIC/)
  })

  it('CORS: ALLOWED_ORIGIN だけを許し、OPTIONS は 204', async () => {
    const { f } = apiFetch(true, good)
    const e = { ...env, ALLOWED_ORIGIN: 'https://app.example.invalid' }
    const pre = await handleRequest(req('OPTIONS', '/classify', undefined, { origin: 'https://app.example.invalid' }), e, f)
    expect(pre.status).toBe(204)
    expect(pre.headers.get('access-control-allow-origin')).toBe('https://app.example.invalid')
    const res = await handleRequest(req('POST', '/classify', { segments: segs }, { origin: 'https://other.example.invalid' }), e, f)
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  // 仕様 6（接続元・ハブ A-03 G29、D-06 N6）: ALLOWED_ORIGIN が設定されていて、接続元が一致しない（無い場合も）POST /classify は 403。Claude は呼ばない。
  it('仕様 6（接続元）: 一致しない・無い接続元の POST /classify は 403。Claude は呼ばない', async () => {
    const { f, calls } = apiFetch(true, good)
    const e = { ...env, ALLOWED_ORIGIN: 'https://app.example.invalid' }
    const other = await handleRequest(req('POST', '/classify', { segments: segs }, { origin: 'https://other.example.invalid' }), e, f)
    const none = await handleRequest(req('POST', '/classify', { segments: segs }), e, f)
    expect(other.status).toBe(403)
    expect(none.status).toBe(403)
    expect(calls).toHaveLength(0)
  })

  // 仕様 7（上限・ハブ A-03 G29、D-02 C12）: 一度に送る線分は 200 本まで。超えたら 413。Claude は呼ばない。
  it('仕様 7（上限）: 線分が 201 本なら 413。Claude は呼ばない', async () => {
    const { f, calls } = apiFetch(true, good)
    const many = Array.from({ length: 201 }, (_, i) => ({ id: `s${i}`, a: { x: 0, y: 0 }, b: { x: 1, y: i } }))
    const res = await handleRequest(req('POST', '/classify', { segments: many }), env, f)
    expect(res.status).toBe(413)
    expect(calls).toHaveLength(0)
  })
})
