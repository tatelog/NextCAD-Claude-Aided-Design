// 仕様（統括の依頼 2026-11-05、t55。G29・G141）: Worker の /chat は、ブラウザからの指示を Claude に転送し、返答を型に通してから返す。
// 仕様 1（鍵）: 鍵は Worker の Secrets から読み、Claude への要求のヘッダーにだけ入る。返答には出さない。
// 仕様 2（ツール）: 操作の列のツールは Worker 側の固定の定義を使う（ブラウザが送った定義は使わない）。
// 仕様 3（検査）: 返答が型に合わなければ 1 回だけ再試行し、それでも合わなければ保留（PendingError）。
// 仕様 4（鍵が無い）: 鍵が無ければ Claude を呼ばず、エラーにする。
// 仕様 5（接続元）: ALLOWED_ORIGIN があり接続元が違えば、要求を受けない（403）。Claude は呼ばない。
import { describe, expect, it } from 'vitest'
import { chatReply } from './chat'
import { PendingError } from './classify'
import { handleRequest } from './index'
import { OPERATIONS_TOOL } from '../chat/chatRequest'

const ok = { type: 'changes', text: '階数を 4 に', changes: [{ op: 'setStoreyCount', count: 4 }] }
const bad = { type: 'changes', text: 'x', changes: [{ op: 'deleteAll' }] }

const toolUse = (input: unknown) =>
  new Response(JSON.stringify({ content: [{ type: 'tool_use', name: OPERATIONS_TOOL.name, input }] }), { status: 200 })

const body = {
  model: 'model-under-test',
  max_tokens: 1024,
  system: '固定の部分',
  messages: [{ role: 'user' as const, content: '階数を 4 に' }],
}

describe('返答（仕様 1・2）', () => {
  it('鍵は Claude への要求のヘッダーにだけ入り、返答は型に通った形で返す', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fetchImpl = async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return toolUse(ok)
    }
    const reply = await chatReply(body, { ANTHROPIC_API_KEY: 'test-key-123' }, fetchImpl)
    expect(reply).toEqual(ok)
    expect((calls[0]!.init.headers as Record<string, string>)['x-api-key']).toBe('test-key-123')
    expect(JSON.stringify(reply)).not.toContain('test-key-123')
  })

  it('ツールは Worker 側の固定の定義だけを送る（ブラウザが送った定義は使わない）', async () => {
    let sent: { tools: { name: string }[] } | null = null
    const fetchImpl = async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body))
      return toolUse(ok)
    }
    await chatReply({ ...body, tools: [{ name: 'evil' }] } as unknown as typeof body, { ANTHROPIC_API_KEY: 'k' }, fetchImpl)
    expect(sent!.tools.map((t) => t.name)).toEqual([OPERATIONS_TOOL.name])
  })

  // 仕様 6（モデル。統括 2026-11-08、公開の前に）: モデルは Worker 側で claude-haiku-5-5 に固定する。ブラウザが送ったモデル名は使わない。
  // 公開した Worker で、誰でもこちらの鍵で高いモデルを呼べないようにするため。
  it('モデルは Worker 側の固定（claude-haiku-5-5）。ブラウザが送ったモデル名（高いモデルを含む）は使わない', async () => {
    const models: string[] = []
    const fetchImpl = async (_url: string, init: RequestInit) => {
      models.push(String(JSON.parse(String(init.body)).model))
      return toolUse(ok)
    }
    await chatReply({ ...body, model: 'claude-fable-5-1' }, { ANTHROPIC_API_KEY: 'k' }, fetchImpl)
    await chatReply({ ...body, model: 'model-under-test' }, { ANTHROPIC_API_KEY: 'k' }, fetchImpl)
    expect(models).toEqual(['claude-haiku-5-5', 'claude-haiku-5-5'])
  })

  // 仕様（統括 2026-11-08）: 道具を強制するので、思考（thinking）を切る指定を送る（claude-haiku-5-5 は既定で思考が入るため）
  it('道具を強制するので、思考を切る指定（thinking: disabled）を送る', async () => {
    let sent: { thinking?: unknown } | null = null
    const fetchImpl = async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body))
      return toolUse(ok)
    }
    await chatReply(body, { ANTHROPIC_API_KEY: 'k' }, fetchImpl)
    expect(sent!.thinking).toEqual({ type: 'disabled' })
  })
})

describe('検査（仕様 3）', () => {
  it('一度目が型に合わず二度目が合えば、その返答を使う（再試行は 1 回だけ）', async () => {
    let n = 0
    const fetchImpl = async () => {
      n++
      return toolUse(n === 1 ? bad : ok)
    }
    const reply = await chatReply(body, { ANTHROPIC_API_KEY: 'k' }, fetchImpl)
    expect(reply).toEqual(ok)
    expect(n).toBe(2)
  })

  it('二度とも型に合わなければ、保留（PendingError）。呼び出しは 2 回まで', async () => {
    let n = 0
    const fetchImpl = async () => {
      n++
      return toolUse(bad)
    }
    await expect(chatReply(body, { ANTHROPIC_API_KEY: 'k' }, fetchImpl)).rejects.toBeInstanceOf(PendingError)
    expect(n).toBe(2)
  })
})

describe('鍵と接続元（仕様 4・5）', () => {
  it('鍵が無ければ Claude を呼ばず、エラーにする', async () => {
    let called = false
    const fetchImpl = async () => {
      called = true
      return toolUse(ok)
    }
    await expect(chatReply(body, {}, fetchImpl)).rejects.toThrow()
    expect(called).toBe(false)
  })

  it('ALLOWED_ORIGIN があり接続元が違えば、403。Claude は呼ばない', async () => {
    let called = false
    const fetchImpl = async () => {
      called = true
      return toolUse(ok)
    }
    const req = new Request('https://worker.example/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
      body: JSON.stringify(body),
    })
    const res = await handleRequest(req, { ANTHROPIC_API_KEY: 'k', ALLOWED_ORIGIN: 'https://app.example' }, fetchImpl)
    expect(res.status).toBe(403)
    expect(called).toBe(false)
  })
})
