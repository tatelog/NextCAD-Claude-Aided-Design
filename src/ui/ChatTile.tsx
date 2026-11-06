// 右パネルの「Claude（チャット）」（ハブ A-03 G95・G96・G97・G14、統括の依頼 t55）。
// 自由な文で指示する。Claude の質問は選択肢のボタンで出す。図面を変えた返答は、変更の説明と「変更を戻す」を出す。
// 閉じる（×）は呼び出し側（PanelTile の × と同じ状態）。返信の仕組みは未接続のときは注記を出す。
import { useState } from 'react'
import { useChat, type ChatMessage } from '../store/chat'

const ROLE_LABEL: Record<ChatMessage['role'], string> = { user: 'あなた', claude: 'Claude', system: '記録' }

export interface ChatTileProps {
  /** 作業ログに残す画面（P2 か P3） */
  screen: string
  fillHeight?: boolean
}

export function ChatTile({ screen, fillHeight = false }: ChatTileProps) {
  const messages = useChat((s) => s.messages)
  const sending = useChat((s) => s.sending)
  const notice = useChat((s) => s.notice)
  const undo = useChat((s) => s.undo)
  const [draft, setDraft] = useState('')
  const last = messages.at(-1)
  // 選択肢は、最後の返答が質問のときだけ出す（選んだら、その文が次の指示になる）
  const choices = last?.role === 'claude' && last.choices ? last.choices : []

  const send = (text: string) => {
    void useChat.getState().send(text, screen)
  }

  return (
    <div style={{ fontSize: 13, ...(fillHeight ? {display:"flex",flexDirection:"column",flex:1,minHeight:0} as const : {}) }}>
      <div style={fillHeight ? {flex:1,minHeight:0,overflowY:"auto",overflowWrap:"anywhere"} : undefined}>
      {notice ? <p style={{ color: '#a33', fontSize: 12 }}>{notice}</p> : null}
      <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 8px', maxHeight: fillHeight ? undefined : 260, overflowY: fillHeight ? undefined : 'auto' }}>
        {messages.map((m) => (
          <li key={m.id} style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: '#5b6670' }}>{ROLE_LABEL[m.role]}</span>
            <div>{m.text}</div>
            {m.changes && m.changes.length > 0 ? (
              <ul style={{ margin: '2px 0 0', paddingLeft: 16, fontSize: 12 }}>
                {m.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
      {choices.length > 0 && !sending ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {choices.map((c) => (
            <button key={c} type="button" onClick={() => send(c)} style={{ font: 'inherit', fontSize: 12, padding: '3px 10px' }}>
              {c}
            </button>
          ))}
        </div>
      ) : null}
      {undo ? (
        <div style={{ border: '1px solid #ddd8cc', borderRadius: 6, padding: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: '#5b6670' }}>反映した変更（これでいいか。違えば戻す）</div>
          <ul style={{ margin: '4px 0', paddingLeft: 16, fontSize: 12 }}>
            {undo.summary.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <button type="button" onClick={() => useChat.getState().undoLast(screen)} style={{ font: 'inherit', fontSize: 12, padding: '3px 10px' }}>
            変更を戻す
          </button>
        </div>
      ) : null}
      </div>
      <form
        style={{flexShrink:0, paddingTop:8, background:"#fff"}}
        onSubmit={(e) => {
          e.preventDefault()
          send(draft)
          setDraft('')
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="自由な文で指示する（例：階数を 5 にして）"
          style={{ width: '100%', boxSizing:'border-box', resize:'vertical', maxHeight:160, font: 'inherit', fontSize: 13 }}
        />
        <button type="submit" disabled={sending || draft.trim() === ''} style={{ font: 'inherit', fontSize: 12, padding: '3px 12px', marginTop: 4 }}>
          送る
        </button>
      </form>
    </div>
  )
}
