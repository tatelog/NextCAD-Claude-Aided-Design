// チャットの要求の形（ハブ A-03 G29・G141、統括の依頼 t55）。ブラウザは Claude の API を直接呼ばず、Worker の /chat へ送る。鍵は含めない。決定論。
// 返答は「操作の列（操作名と引数）」を tool use のスキーマで返させる。アプリが検査してから実行する（claudeReply.ts）。
// モデル名は設定値で持つ。既定は仮置き（モデルの決定は未決。統括が起票）。

import { KINDS } from '../plan/semantic'

// 図面の変更の一件の形。claudeReply.ts の ChangeSchema の 6 種と一致させる（項目・型・必須）。
// 道具の定義に項目と型を書かないと、Claude は項目の名前を外し、返答が型に合わず弾かれる（統括の依頼 2026-11-06。A）
const CHANGE_ITEMS: Record<string, unknown>[] = [
  { type: 'object', properties: { op: { type: 'string', enum: ['setStoreyCount'] }, count: { type: 'integer', minimum: 1, maximum: 30 } }, required: ['op', 'count'] },
  { type: 'object', properties: { op: { type: 'string', enum: ['setStoreyHeight'] }, mm: { type: 'integer', minimum: 1 } }, required: ['op', 'mm'] },
  { type: 'object', properties: { op: { type: 'string', enum: ['setKind'] }, segmentId: { type: 'string', minLength: 1, description: '文脈の『選んだ線』にある線の id だけを使う（選んでいない線・存在しない id は図面に反映されない）' }, kind: { type: 'string', enum: [...KINDS] } }, required: ['op', 'segmentId', 'kind'] },
  { type: 'object', properties: { op: { type: 'string', enum: ['setUnitPrice'] }, id: { type: 'string', minLength: 1 }, unit_price: { type: 'integer', minimum: 0, maximum: 1000000000 } }, required: ['op', 'id', 'unit_price'] },
  { type: 'object', properties: { op: { type: 'string', enum: ['setFactor'] }, id: { type: 'string', minLength: 1 }, factor: { type: 'number', exclusiveMinimum: 0, maximum: 1000 } }, required: ['op', 'id', 'factor'] },
  { type: 'object', properties: { op: { type: 'string', enum: ['addLine'] }, start: { type: 'object', properties: { x: { type: 'integer' }, y: { type: 'integer' } }, required: ['x', 'y'] }, lengthMm: { type: 'number', exclusiveMinimum: 0, maximum: 100000 }, angleDeg: { type: 'number' } }, required: ['op', 'start', 'lengthMm', 'angleDeg'] },
]

/** モデルの既定（仮置き。未決） */
export const CHAT_MODEL_DEFAULT = 'claude-haiku-5-5'

export const OPERATIONS_TOOL = {
  name: 'apply_operations',
  description: '指示への返答。answer（答え）、question（選択肢で聞き返す）、changes（図面の操作の列）のどれか。図面の変更は操作の列で返す。',
  input_schema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['answer', 'question', 'changes'] },
      text: { type: 'string' },
      choices: { type: 'array', items: { type: 'string' } },
      changes: { type: 'array', items: { anyOf: CHANGE_ITEMS } },
    },
    required: ['type', 'text'],
  },
}

export interface ChatRequestInput {
  workerUrl: string
  model: string
  /** 文脈の区切り（buildChatContext の結果。先頭ほど変わりにくい） */
  blocks: readonly string[]
  history: readonly { role: 'user' | 'claude'; text: string }[]
}

/** Worker の /chat へ送る要求。鍵のヘッダーは持たない（鍵は Worker の Secrets） */
export function buildChatRequest(input: ChatRequestInput): { url: string; init: RequestInit } {
  const body = {
    model: input.model,
    max_tokens: 1024,
    system: input.blocks.join('\n\n'),
    tools: [OPERATIONS_TOOL],
    tool_choice: { type: 'tool', name: OPERATIONS_TOOL.name },
    messages: input.history.map((h) => ({ role: h.role === 'claude' ? 'assistant' : 'user', content: h.text })),
  }
  return {
    url: `${input.workerUrl.replace(/\/$/, '')}/chat`,
    init: { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
  }
}
