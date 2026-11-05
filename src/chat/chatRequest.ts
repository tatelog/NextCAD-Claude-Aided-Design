// チャットの要求の形（ハブ A-03 G29・G141、統括の依頼 t55）。ブラウザは Claude の API を直接呼ばず、Worker の /chat へ送る。鍵は含めない。決定論。
// 返答は「操作の列（操作名と引数）」を tool use のスキーマで返させる。アプリが検査してから実行する（claudeReply.ts）。
// モデル名は設定値で持つ。既定は仮置き（モデルの決定は未決。統括が起票）。

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
      changes: {
        type: 'array',
        items: {
          type: 'object',
          properties: { op: { type: 'string', enum: ['setStoreyCount', 'setStoreyHeight', 'setKind', 'addLine'] } },
          required: ['op'],
        },
      },
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
