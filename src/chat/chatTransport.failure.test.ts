// 仕様（統括の依頼 2026-11-05。Chat の失敗の種類を分ける）:
// 仕様 1（届かない）: 通信が失敗したら（Worker が動いていない・つながらない）、ChatUnreachableError にする。
// 仕様 2（失敗の状態）: Worker が 500 などを返したら、その状態を持つ ChatWorkerError にする。
// 仕様 3（保留）: 503 は、今までどおり ChatPendingError（失敗の種類を取り違えない）。
import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '../store/chat'
import { ChatPendingError, ChatUnreachableError, ChatWorkerError, chatTransportOf } from './chatTransport'

const ctx = { screen: 'P2', mode: 'chat', memoryText: '', segments: [], selectedSegmentIds: [], recentOps: [] }
const hist: ChatMessage[] = [{ id: 1, role: 'user', text: 'こんにちは' }]
const transport = (fetchImpl: (url: string, init: RequestInit) => Promise<Response>) =>
  chatTransportOf({ workerUrl: 'https://w.example', model: 'm', fetchImpl, contextOf: () => ctx })

describe('Chat の通信の失敗の種類（仕様 1〜3）', () => {
  it('仕様 1: 届かない（fetch が失敗する）ときは、ChatUnreachableError', async () => {
    const fetchImpl = async (): Promise<Response> => {
      throw new TypeError('Failed to fetch')
    }
    await expect(transport(fetchImpl)(hist)).rejects.toBeInstanceOf(ChatUnreachableError)
  })

  it('仕様 2: Worker が 500 を返したら、ChatWorkerError（状態 500）', async () => {
    const fetchImpl = async (): Promise<Response> => new Response('{}', { status: 500 })
    const err = await transport(fetchImpl)(hist).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ChatWorkerError)
    expect((err as ChatWorkerError).status).toBe(500)
  })

  it('仕様 3: 503 は、ChatPendingError のまま（ChatWorkerError と取り違えない）', async () => {
    const fetchImpl = async (): Promise<Response> => new Response('{}', { status: 503 })
    const err = await transport(fetchImpl)(hist).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ChatPendingError)
    expect(err).not.toBeInstanceOf(ChatWorkerError)
  })
})
