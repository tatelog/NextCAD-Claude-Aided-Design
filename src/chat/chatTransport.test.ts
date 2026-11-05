// 仕様（統括の依頼 2026-11-05、t55 の残り。G29・G142・G144）: チャットの返信は、Worker の /chat を通して Claude から受ける。
// 文脈は店舗の状態から組み立てる（固定の部分 → 案件の要約 → 周辺 → 直近の操作）。
// 仕様 1（送り先）: Worker の /chat に送り、返答の reply をそのまま返す（型の検査は店舗が行う）。
// 仕様 2（文脈の並び）: 送る system は、固定の部分（画面・モード）から先に並ぶ。
// 仕様 3（履歴）: 履歴は user と claude だけ。system の文（アプリの通知）は Claude に送らない。
// 仕様 4（失敗）: Worker が失敗したら例外にする（店舗が「返答を読めませんでした」を出す）。
// 仕様 5（文脈の入力）: 作業ログは新しい順で届くので、古い順に直す。線は種類があるものだけ種類を持つ。案件の要約を入れる。
import { describe, expect, it } from 'vitest'
import { ChatPendingError, chatTransportOf, contextInputOf } from './chatTransport'
import type { ChatMessage } from '../store/chat'
import type { ChatContextInput } from './chatContext'

const ctx: ChatContextInput = {
  screen: 'P2',
  mode: 'chat',
  memoryText: '案件の要約文',
  segments: [],
  selectedSegmentIds: [],
  recentOps: [],
}

const hist: ChatMessage[] = [
  { id: 1, role: 'user', text: '階数を 4 に' },
  { id: 2, role: 'system', text: '変更を戻しました' },
  { id: 3, role: 'claude', text: 'はい' },
]

describe('送り先と返答（仕様 1）', () => {
  it('Worker の /chat に送り、reply をそのまま返す', async () => {
    let url = ''
    const fetchImpl = async (u: string): Promise<Response> => {
      url = u
      return new Response(JSON.stringify({ reply: { type: 'answer', text: 'x' } }), { status: 200 })
    }
    const t = chatTransportOf({ workerUrl: 'https://w.example', model: 'model-under-test', fetchImpl, contextOf: () => ctx })
    expect(await t(hist)).toEqual({ type: 'answer', text: 'x' })
    expect(url).toBe('https://w.example/chat')
  })
})

describe('文脈と履歴（仕様 2・3）', () => {
  it('system は固定の部分から先に並び、履歴は user と claude だけ', async () => {
    let sent: { system: string; messages: { role: string }[] } | null = null
    const fetchImpl = async (_u: string, init: RequestInit): Promise<Response> => {
      sent = JSON.parse(String(init.body))
      return new Response(JSON.stringify({ reply: { type: 'answer', text: 'x' } }), { status: 200 })
    }
    await chatTransportOf({ workerUrl: 'https://w.example', model: 'm', fetchImpl, contextOf: () => ctx })(hist)
    expect(sent!.system.indexOf('画面: P2')).toBeLessThan(sent!.system.indexOf('案件の要約文'))
    expect(sent!.messages.map((m) => m.role)).toEqual(['user', 'assistant'])
  })
})

describe('失敗（仕様 4）', () => {
  it('Worker が失敗したら例外にする', async () => {
    const fetchImpl = async (): Promise<Response> => new Response('{}', { status: 500 })
    await expect(chatTransportOf({ workerUrl: 'https://w.example', model: 'm', fetchImpl, contextOf: () => ctx })(hist)).rejects.toThrow()
  })

  // 保留（503）は、型に合わない返答と区別して伝える（仕様 9。店舗が「保留」と出す）
  it('Worker が保留（503）を返したら、保留の例外（ChatPendingError）にする', async () => {
    const fetchImpl = async (): Promise<Response> => new Response('{}', { status: 503 })
    await expect(chatTransportOf({ workerUrl: 'https://w.example', model: 'm', fetchImpl, contextOf: () => ctx })(hist)).rejects.toBeInstanceOf(
      ChatPendingError,
    )
  })
})

describe('文脈の入力（仕様 5）', () => {
  it('作業ログは古い順に直し、線は種類があるものだけ種類を持つ。案件の要約を入れる', () => {
    const input = contextInputOf({
      screen: 'P2',
      mode: 'chat',
      rows: [
        { at: 't2', screen: 'P2', action: '操作', target: 'b' },
        { at: 't1', screen: 'P2', action: '操作', target: 'a' },
      ],
      entries: [{ segments: [{ id: 's1' }, { id: 's2' }] }],
      assignments: { s1: { kind: 'wall' } },
      selectedSegmentIds: ['s1'],
    })
    expect(input.recentOps).toEqual(['t1 P2 操作 a', 't2 P2 操作 b'])
    expect(input.memoryText).toContain('t1 P2 操作 a')
    expect(input.segments).toEqual([
      { id: 's1', kind: 'wall' },
      { id: 's2', kind: null },
    ])
    expect(input.selectedSegmentIds).toEqual(['s1'])
  })
})
