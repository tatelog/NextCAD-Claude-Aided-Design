// 条例の値の補完の中継（ハブ A-03 G15・D-02 C4 の W4、C12）。Cloudflare Worker から呼ぶ想定。
// キーは環境変数（Worker の Secrets）から読み、ヘッダー以外には出さない。出力は tool use のスキーマで強制し、law/ordinanceSuggest で検査する。
// 失敗は 1 回だけ再試行し、それでも失敗したら保留（PENDING）として返す。実際の API への接続は、Worker の配備と鍵が要るため未確認。
import { acceptSuggestions, type OrdinanceSuggestion } from '../law/ordinanceSuggest'
import { PendingError, type Env } from './classify'

type FetchLike = (url: string, init: RequestInit) => Promise<Response>

const MODEL = 'claude-haiku-5-5'
const ENDPOINT = 'https://api.anthropic.com/v1/messages'
const TOOL_NAME = 'suggest_ordinance'

export interface OrdinanceRequest {
  /** 自治体名（例: 東京都江東区） */
  city: string
  /** 用途地域（例: 住居系） */
  zone: string
  /** 条例本文の抜粋（人が貼ったもの） */
  text: string
}

const TOOL = {
  name: TOOL_NAME,
  description: '条例本文の抜粋から、日影の規制値（10 m 以内の時間・10 m 超の時間・測定面の高さ）を、本文に書かれている値だけで返す。出典は条例名と条項。',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item: { type: 'string', enum: ['日影時間（10 m 以内）', '日影時間（10 m 超）', '測定面の高さ'] },
            value: { type: 'string' },
            source: { type: 'string' },
          },
          required: ['item', 'value', 'source'],
        },
      },
    },
    required: ['items'],
  },
}

function buildBody(req: OrdinanceRequest) {
  return {
    model: MODEL,
    max_tokens: 1024,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL_NAME },
    messages: [
      {
        role: 'user',
        content: [
          `自治体: ${req.city}`,
          `用途地域: ${req.zone}`,
          '次の条例本文の抜粋から、日影の規制値を取り出してください。本文に書かれていない値は出さない。出典（条例名と条項）が本文から読めないものも出さない。',
          `条例本文の抜粋:\n${req.text}`,
        ].join('\n'),
      },
    ],
  }
}

async function once(req: OrdinanceRequest, key: string, fetchImpl: FetchLike): Promise<{ accepted: OrdinanceSuggestion[]; dropped: number }> {
  const res = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(buildBody(req)),
  })
  if (!res.ok) throw new Error(`API が失敗: ${res.status}`)
  const json = (await res.json()) as { content?: { type: string; name?: string; input?: { items?: unknown } }[] }
  const block = json.content?.find((b) => b.type === 'tool_use' && b.name === TOOL_NAME)
  if (!block) throw new Error('tool_use が無い')
  return acceptSuggestions(block.input?.items)
}

/** 条例本文から日影の規制値を補う。検査を通った項目と、捨てた数を返す（捨てた数は呼び出し側の表示用） */
export async function suggestOrdinance(req: OrdinanceRequest, env: Env, fetchImpl: FetchLike): Promise<{ accepted: OrdinanceSuggestion[]; dropped: number }> {
  const key = env.ANTHROPIC_API_KEY
  if (!key) throw new Error('API キーが無い（Worker の Secrets に置く）')
  let lastError: unknown = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await once(req, key, fetchImpl)
    } catch (e) {
      lastError = e
    }
  }
  throw new PendingError(`保留（再試行しても失敗）: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
}
