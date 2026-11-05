// チャットの返信の仕組み（ハブ A-03 G29・G142・G144、統括の依頼 t55 の残り）。店舗（store/chat.ts）の transport に入れる。
// 文脈は店舗の状態から組み立て、Worker の /chat に送る。返答は reply をそのまま返す（型の検査は店舗が行う）。決定論。
import type { ChatTransport, ChatMessage } from '../store/chat'
import { buildChatContext, CHAT_MEMORY_MAX_CHARS, type ChatContextInput } from './chatContext'
import { buildChatRequest } from './chatRequest'
import { memorySummaryOf, type MemoryRow } from './memory'

type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export interface ChatTransportOptions {
  workerUrl: string
  model: string
  fetchImpl: FetchLike
  /** 送るたびに、いまの店舗の状態から文脈を作る */
  contextOf: () => ChatContextInput
}

/** 履歴のうち、Claude に送るもの（user と claude。system の文はアプリの通知なので送らない） */
function historyOf(history: readonly ChatMessage[]): { role: 'user' | 'claude'; text: string }[] {
  return history.filter((m) => m.role !== 'system').map((m) => ({ role: m.role === 'claude' ? 'claude' : 'user', text: m.text }))
}

/** Worker が保留と返した（再試行でも返答が型に合わなかった）。店舗は、型に合わない返答と区別して「保留」と出す */
export class ChatPendingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ChatPendingError'
  }
}

export function chatTransportOf(opts: ChatTransportOptions): ChatTransport {
  return async (history) => {
    const blocks = buildChatContext(opts.contextOf())
    const req = buildChatRequest({ workerUrl: opts.workerUrl, model: opts.model, blocks, history: historyOf(history) })
    const res = await opts.fetchImpl(req.url, req.init)
    if (res.status === 503) throw new ChatPendingError('Worker が保留（再試行でも返答が型に合わない）')
    if (!res.ok) throw new Error(`Worker が失敗: ${res.status}`)
    const json = (await res.json()) as { reply?: unknown }
    if (json.reply === undefined) throw new Error('返答が無い')
    return json.reply
  }
}

/** 店舗の状態から、文脈の入力を作る。作業ログは新しい順で届くので、古い順に直す */
export interface ContextSource {
  screen: string
  mode: string
  /** 作業ログの行（新しい順。recentWorkLog の並び） */
  rows: readonly MemoryRow[]
  entries: readonly { segments: readonly { id: string }[] }[]
  /** 線の id → 種類（種類が無い線は無い） */
  assignments: Readonly<Record<string, { kind: string }>>
  selectedSegmentIds: readonly string[]
}

export function contextInputOf(src: ContextSource): ChatContextInput {
  const oldestFirst = [...src.rows].reverse()
  return {
    screen: src.screen,
    mode: src.mode,
    memoryText: memorySummaryOf(oldestFirst, CHAT_MEMORY_MAX_CHARS),
    segments: src.entries.flatMap((e) => e.segments).map((s) => ({ id: s.id, kind: src.assignments[s.id]?.kind ?? null })),
    selectedSegmentIds: src.selectedSegmentIds,
    recentOps: oldestFirst.map((r) => `${r.at} ${r.screen} ${r.action} ${r.target}`),
  }
}
