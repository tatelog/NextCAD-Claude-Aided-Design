// 意味判定の中継（D-02 C12、A-03 G29・G31）。Cloudflare Worker から呼ぶ想定。
// キーは環境変数（Worker の Secrets）から読み、ヘッダー以外には出さない。出力は tool use のスキーマで強制し、検証する。
// 失敗は 1 回だけ再試行し、それでも失敗したら保留（PENDING）として返す。実際の API への接続はまだ確認していない。
import { KINDS, parseClassifierOutput } from '../plan/semantic'

export const PENDING = 'PENDING'

export interface Env {
  ANTHROPIC_API_KEY?: string
}

export class PendingError extends Error {
  readonly code = PENDING
}

export interface SegmentIn {
  id: string
  a: { x: number; y: number }
  b: { x: number; y: number }
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>

const MODEL = 'claude-haiku-5-5'
const ENDPOINT = 'https://api.anthropic.com/v1/messages'
const TOOL_NAME = 'classify_segments'

const TOOL = {
  name: TOOL_NAME,
  description: '線分ごとに、建物の種別（壁・柱・梁・開口・通り芯・部屋・その他）と確信度（0〜1）を返す。判断するだけで、聞き返さない。',
  input_schema: {
    type: 'object',
    properties: {
      segments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            segment_id: { type: 'string' },
            kind: { type: 'string', enum: [...KINDS] },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
          required: ['segment_id', 'kind', 'confidence'],
        },
      },
    },
    required: ['segments'],
  },
}

function buildBody(segments: SegmentIn[]) {
  const lines = segments.map((s) => ({ segment_id: s.id, a: s.a, b: s.b }))
  return {
    model: MODEL,
    max_tokens: 1024,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL_NAME },
    // claude-haiku-5-5 は既定で思考が入り、道具の強制と同時に使えないので切る（統括 2026-11-08）
    thinking: { type: 'disabled' },
    messages: [
      {
        role: 'user',
        content: `次の線分（mm 座標）に、種別と確信度を付けてください。線分:\n${JSON.stringify(lines)}`,
      },
    ],
  }
}

async function once(segments: SegmentIn[], key: string, fetchImpl: FetchLike) {
  const res = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(buildBody(segments)),
  })
  if (!res.ok) throw new Error(`API が失敗: ${res.status}`)
  const json = (await res.json()) as { content?: { type: string; name?: string; input?: { segments?: unknown } }[] }
  const block = json.content?.find((b) => b.type === 'tool_use' && b.name === TOOL_NAME)
  if (!block) throw new Error('tool_use が無い')
  return parseClassifierOutput(block.input?.segments)
}

export async function classifySegments(segments: SegmentIn[], env: Env, fetchImpl: FetchLike) {
  const key = env.ANTHROPIC_API_KEY
  if (!key) throw new Error('API キーが無い（Worker の Secrets に置く）')
  let lastError: unknown = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await once(segments, key, fetchImpl)
    } catch (e) {
      lastError = e
    }
  }
  throw new PendingError(`判定を保留（再試行しても失敗）: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
}
