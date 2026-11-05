// Claude とのチャットの状態（ハブ A-03 G96・G97・G14、統括の依頼 t55）。画面の中だけで持つ（保存はしない）。
// Claude の呼び出しは未接続。返信の仕組み（transport）は Worker の設定（t15）が済んでから入れる。API キーはブラウザに置かない。
import { create } from 'zustand'
import { recordWorkLog } from '../app/workLogStore'
import { applyChangeBatch, restoreSnapshot, type ChangeSnapshot } from '../chat/applyChanges'
import { parseClaudeReply } from '../chat/claudeReply'

export type ChatRole = 'user' | 'claude' | 'system'

export interface ChatMessage {
  id: number
  role: ChatRole
  text: string
  /** 質問の選択肢（ボタンで出す。G96） */
  choices?: readonly string[]
  /** 図面に入れた変更の説明（G97） */
  changes?: readonly string[]
}

/** 返信の仕組み。履歴を渡すと、Claude の返答（まだ型を確かめていない値）を返す */
export type ChatTransport = (history: readonly ChatMessage[]) => Promise<unknown>

export const UNCONNECTED_NOTICE = '未接続: Claude の返信の仕組みが未設定です（Worker の設定が入るまで図面は変わりません）'

export interface ChatState {
  messages: ChatMessage[]
  sending: boolean
  notice: string | null
  /** 戻せる直前の変更（一回分） */
  undo: { snapshot: ChangeSnapshot; summary: string[] } | null
  transport: ChatTransport | null
  nextId: number
  setTransport: (t: ChatTransport | null) => void
  /** 文を送る。空の文・送信中は何もしない。screen は作業ログの画面 */
  send: (text: string, screen: string) => Promise<void>
  /** 直前の変更を戻す。作業ログに残す */
  undoLast: (screen: string) => void
}

const logWork = (screen: string, action: string, target: string) =>
  recordWorkLog({ at: new Date().toISOString(), screen, action, target, who: 'Claude' })

export const useChat = create<ChatState>((set, get) => {
  const push = (m: Omit<ChatMessage, 'id'>) => {
    const id = get().nextId
    set((s) => ({ messages: [...s.messages, { ...m, id }], nextId: id + 1 }))
  }
  return {
    messages: [],
    sending: false,
    notice: null,
    undo: null,
    transport: null,
    nextId: 1,
    setTransport: (transport) => set({ transport }),
    send: async (text, screen) => {
      const body = text.trim()
      if (body === '' || get().sending) return
      push({ role: 'user', text: body })
      const transport = get().transport
      if (transport === null) {
        set({ notice: UNCONNECTED_NOTICE })
        return
      }
      set({ sending: true, notice: null })
      try {
        const reply = parseClaudeReply(await transport(get().messages))
        if (reply.type === 'answer') {
          push({ role: 'claude', text: reply.text })
        } else if (reply.type === 'question') {
          push({ role: 'claude', text: reply.text, choices: reply.choices })
        } else {
          const applied = applyChangeBatch(reply.changes)
          push({
            role: 'claude',
            text: reply.text,
            changes: [...applied.summary, ...applied.skipped.map((s) => `（反映しない）${s}`)],
          })
          if (applied.summary.length > 0) {
            set({ undo: { snapshot: applied.before, summary: applied.summary } })
            logWork(screen, 'Claude の変更', applied.summary.join('、'))
          }
        }
      } catch {
        set({ notice: '返答を読めませんでした。図面は変えていません。' })
      } finally {
        set({ sending: false })
      }
    },
    undoLast: (screen) => {
      const u = get().undo
      if (u === null) return
      restoreSnapshot(u.snapshot)
      push({ role: 'system', text: `変更を戻しました（${u.summary.join('、')}）` })
      logWork(screen, 'Claude の変更を戻す', u.summary.join('、'))
      set({ undo: null })
    },
  }
})
