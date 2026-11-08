// Claude とのチャットの状態（ハブ A-03 G96・G97・G14、統括の依頼 t55）。画面の中だけで持つ（保存はしない）。
// Claude の呼び出しは未接続。返信の仕組み（transport）は Worker の設定（t15）が済んでから入れる。API キーはブラウザに置かない。
import { create } from 'zustand'
import { recordWorkLog } from '../app/workLogStore'
import { applyChangeBatch, restoreSnapshot, type ChangeSnapshot } from '../chat/applyChanges'
import { contextSelectedIdsOf, unknownSegmentIdsOf } from '../chat/segmentIdCheck'
import { useDrawing } from './drawing'
import { useSelection } from './selection'
import { parseClaudeReply } from '../chat/claudeReply'
import { ChatPendingError, ChatUnreachableError, ChatWorkerError } from '../chat/chatTransport'
import { WORKER_UNREACHABLE_NOTICE } from '../worker/notices'

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
/** Worker が保留と返したとき（再試行でも型に合わない）。型に合わない返答（下の注記）と区別する */
export const PENDING_NOTICE = '保留: Claude の返答を、再試行でも型に合わせられませんでした。図面は変えていません。'
/** Worker に届かなかったとき（接続の失敗）。返答を読んだのではない */
export const UNREACHABLE_NOTICE = WORKER_UNREACHABLE_NOTICE
/** 返答を読めなかったとき（型に合わない・その他） */
export const UNREADABLE_NOTICE = '返答を読めませんでした。図面は変えていません。'

/** 失敗の種類を、画面に出す一行にする。図面は、どの失敗でも変えない */
export function noticeOfFailure(e: unknown): string {
  if (e instanceof ChatPendingError) return PENDING_NOTICE
  if (e instanceof ChatUnreachableError) return UNREACHABLE_NOTICE
  if (e instanceof ChatWorkerError) return `Worker が失敗しました（${e.status}）。図面は変えていません。`
  return UNREADABLE_NOTICE
}

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
      // 送る時点で、文脈に入れた『選んだ線』の id（返事の線はこの中だけを使う。統括の依頼 2026-11-06。2）
      const allowedIds = contextSelectedIdsOf(useDrawing.getState().entries.flatMap((e) => e.segments), useSelection.getState().segmentIds)
      set({ sending: true, notice: null })
      try {
        const reply = parseClaudeReply(await transport(get().messages))
        if (reply.type === 'answer') {
          push({ role: 'claude', text: reply.text })
        } else if (reply.type === 'question') {
          push({ role: 'claude', text: reply.text, choices: reply.choices })
        } else if (unknownSegmentIdsOf(reply.changes, allowedIds).length > 0) {
          // 選んでいない線（存在しない id）への変更は、図面を変えずに、線を選ぶように出す
          push({ role: 'system', text: '線を選んでから指示してください（選んでいない線・図面に無い線への変更は、図面を変えていません）' })
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
      } catch (e) {
        set({ notice: noticeOfFailure(e) })
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
