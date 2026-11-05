// チャットの返答（ハブ A-03 G29・G141、統括の依頼 t55）。Worker が Claude を呼び、返答の操作の列を型に通してから返す。
// 鍵は Worker の Secrets（ブラウザに出さない）。ツールは Worker 側の固定の定義だけを使う。型に合わなければ 1 回だけ再試行し、
// それでも合わなければ保留（PendingError）。黙って直さない（D-02 C12）。
import { parseClaudeReply, type ClaudeReply } from '../chat/claudeReply'
import { OPERATIONS_TOOL } from '../chat/chatRequest'
import { PendingError, type Env } from './classify'

type FetchLike = (url: string, init: RequestInit) => Promise<Response>

const ENDPOINT = 'https://api.anthropic.com/v1/messages'

export interface ChatBody {
  model: string
  max_tokens: number
  system: string
  messages: readonly unknown[]
}

async function once(body: Record<string, unknown>, key: string, fetchImpl: FetchLike): Promise<ClaudeReply> {
  const res = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API が失敗: ${res.status}`)
  const json = (await res.json()) as { content?: { type: string; name?: string; input?: unknown }[] }
  const block = json.content?.find((b) => b.type === 'tool_use' && b.name === OPERATIONS_TOOL.name)
  if (!block) throw new Error('tool_use が無い')
  return parseClaudeReply(block.input)
}

/** 指示を Claude に送り、返答を型に通して返す。ツールは固定の定義（ブラウザが送った定義は使わない） */
export async function chatReply(body: ChatBody, env: Env, fetchImpl: FetchLike): Promise<ClaudeReply> {
  const key = env.ANTHROPIC_API_KEY
  if (!key) throw new Error('API キーが無い（Worker の Secrets に置く）')
  const sent: Record<string, unknown> = {
    model: body.model,
    max_tokens: body.max_tokens,
    system: body.system,
    messages: body.messages,
    tools: [OPERATIONS_TOOL],
    tool_choice: { type: 'tool', name: OPERATIONS_TOOL.name },
  }
  let last: unknown = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await once(sent, key, fetchImpl)
    } catch (e) {
      last = e
    }
  }
  throw new PendingError(`返答を保留（再試行しても型に合わない）: ${last instanceof Error ? last.message : String(last)}`)
}
