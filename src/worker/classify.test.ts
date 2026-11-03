// 仕様: 意味判定の中継（D-02 C12、A-03 G29・G31、AGENTS.md「API キーはブラウザに出さない」）。
// 仕様 1（G29）: Claude の呼び出しは Worker を通す。API キーは環境変数（Worker の Secrets）から読み、リクエストの本文・ヘッダー以外に出さない。キーが無ければ呼ばない。
// 仕様 2（C12 スキーマ強制）: tool use で classify_segments を強制し、出力は parseClassifierOutput で検証する。外れた出力は弾く。
// 仕様 3（G31）: 失敗（通信失敗・スキーマ外）は 1 回だけ再試行する。それでも失敗したら保留として返す（例外の種類 PENDING）。
// 仕様 4: モデルは claude-haiku-5-5（D-02 C12 の仮置き）。種別は 7 つ（G13）。
// 注: 実際の API への呼び出しはまだ確認していない（キーと配備が未決）。ここではフェッチを差し替えて検証する。
import { describe, expect, it } from 'vitest'
import { classifySegments, PENDING, type Env } from './classify'

const segments = [
  { id: 's1', a: { x: 0, y: 0 }, b: { x: 5_000, y: 0 } },
  { id: 's2', a: { x: 5_000, y: 0 }, b: { x: 5_000, y: 4_000 } },
]

const goodToolUse = {
  content: [
    {
      type: 'tool_use',
      name: 'classify_segments',
      input: {
        segments: [
          { segment_id: 's1', kind: 'wall', confidence: 0.9 },
          { segment_id: 's2', kind: 'column', confidence: 0.6 },
        ],
      },
    },
  ],
}

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

const env: Env = { ANTHROPIC_API_KEY: 'test-key-not-real' }

describe('classifySegments（Worker 中継）', () => {
  it('モデル・ツールの強制・7 種別のスキーマを本文に入れ、キーは本文に入れない', async () => {
    const { fetchImpl, calls } = fakeFetch([{ ok: true, body: goodToolUse }])
    await classifySegments(segments, env, fetchImpl)
    const body = JSON.parse(String(calls[0]!.init.body))
    expect(body.model).toBe('claude-haiku-5-5')
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'classify_segments' })
    const kindEnum = body.tools[0].input_schema.properties.segments.items.properties.kind.enum
    expect(kindEnum).toEqual(['wall', 'column', 'beam', 'opening', 'grid', 'room', 'other'])
    expect(JSON.stringify(body)).not.toContain('test-key-not-real')
  })

  it('キーは x-api-key ヘッダーで送る', async () => {
    const { fetchImpl, calls } = fakeFetch([{ ok: true, body: goodToolUse }])
    await classifySegments(segments, env, fetchImpl)
    const headers = calls[0]!.init.headers as Record<string, string>
    expect(headers['x-api-key']).toBe('test-key-not-real')
  })

  it('キーが無ければ呼ばずに弾く', async () => {
    const { fetchImpl, calls } = fakeFetch([{ ok: true, body: goodToolUse }])
    await expect(classifySegments(segments, {} as Env, fetchImpl)).rejects.toThrow()
    expect(calls).toHaveLength(0)
  })

  it('正しい出力は検証して返す', async () => {
    const { fetchImpl } = fakeFetch([{ ok: true, body: goodToolUse }])
    const out = await classifySegments(segments, env, fetchImpl)
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({ segment_id: 's1', kind: 'wall', confidence: 0.9 })
  })

  it('失敗したら 1 回だけ再試行し、成功すればその結果を返す', async () => {
    const { fetchImpl, calls } = fakeFetch([{ ok: false, body: {} }, { ok: true, body: goodToolUse }])
    const out = await classifySegments(segments, env, fetchImpl)
    expect(calls).toHaveLength(2)
    expect(out).toHaveLength(2)
  })

  it('再試行しても失敗したら保留（PENDING）として弾く', async () => {
    const { fetchImpl, calls } = fakeFetch([{ ok: false, body: {} }, { ok: false, body: {} }])
    await expect(classifySegments(segments, env, fetchImpl)).rejects.toMatchObject({ code: PENDING })
    expect(calls).toHaveLength(2)
  })

  it('スキーマ外の種別は弾き、再試行の対象にする', async () => {
    const bad = { content: [{ type: 'tool_use', name: 'classify_segments', input: { segments: [{ segment_id: 's1', kind: '外形', confidence: 0.9 }] } }] }
    const { fetchImpl, calls } = fakeFetch([{ ok: true, body: bad }, { ok: true, body: bad }])
    await expect(classifySegments(segments, env, fetchImpl)).rejects.toMatchObject({ code: PENDING })
    expect(calls).toHaveLength(2)
  })
})
