// 仕様（統括の依頼 2026-11-05「Chat が Worker 未接続のとき『返答を読めませんでした』と出る」）:
// 仕様 1（つながらない）: Worker に届かない（通信の失敗）ときは、「Worker につながりません」と出す。「読めませんでした」とは出さない。
// 仕様 2（Worker の失敗）: Worker が失敗を返したら、その状態を添えて「Worker が失敗しました（状態）」と出す。
// 仕様 3（読めない）: Worker は返したが、返答が型に合わないときは、今までどおり「読めませんでした」。
// 仕様 4（未接続）: Worker の URL が無い（返信の仕組みが無い）ときは、「未接続」の一行。図面は変えない。
// 注: 図面は、どの失敗でも変えない（既存の仕様）。
import { beforeEach, describe, expect, it } from 'vitest'
import { useChat, UNCONNECTED_NOTICE, type ChatTransport } from './chat'
import { ChatUnreachableError, ChatWorkerError } from '../chat/chatTransport'
import { useDrawing } from './drawing'

beforeEach(() => {
  useChat.setState({ messages: [], notice: null, sending: false, undo: null, transport: null })
  useDrawing.setState({ entries: [], past: [], redoStack: [], storeyCount: 3 })
})

const failing = (error: Error): ChatTransport => async () => {
  throw error
}

describe('Chat の失敗の文言（仕様 1〜4）', () => {
  it('仕様 1: つながらないときは「Worker につながりません」と出し、「読めませんでした」とは出さない', async () => {
    useChat.setState({ transport: failing(new ChatUnreachableError('Worker につながりません')) })
    await useChat.getState().send('直して', 'P2')
    expect(useChat.getState().notice).toContain('Worker につながりません')
    expect(useChat.getState().notice).not.toContain('読めませんでした')
    expect(useDrawing.getState().storeyCount).toBe(3)
  })

  it('仕様 2: Worker が失敗を返したら、状態を添えて「Worker が失敗しました」と出す', async () => {
    useChat.setState({ transport: failing(new ChatWorkerError(500)) })
    await useChat.getState().send('直して', 'P2')
    expect(useChat.getState().notice).toContain('Worker が失敗しました（500）')
    expect(useChat.getState().notice).not.toContain('読めませんでした')
  })

  it('仕様 3: 返答が型に合わない（通信は成功）ときは、今までどおり「読めませんでした」', async () => {
    useChat.setState({ transport: failing(new Error('返答が無い')) })
    await useChat.getState().send('直して', 'P2')
    expect(useChat.getState().notice).toContain('読めませんでした')
  })

  it('仕様 4: Worker の URL が無い（未接続）は、未接続の一行を出す', async () => {
    useChat.setState({ transport: null })
    await useChat.getState().send('直して', 'P2')
    expect(useChat.getState().notice).toBe(UNCONNECTED_NOTICE)
  })
})
