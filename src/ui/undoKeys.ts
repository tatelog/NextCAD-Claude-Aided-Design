// Undo・Redo のキー（ハブ A-03 G68、設計グリルの依頼 2026-11-05）。Ctrl+Z（⌘Z）で Undo、Ctrl+Y・Ctrl+Shift+Z（⌘Y・⌘Shift+Z）で Redo。
// 文字の入力欄にいるときは、ブラウザの元に戻す（文字）に任せ、図面は戻さない。決定論。

export interface KeyLike {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  /** キーを受けた要素（無ければ null） */
  target: { tagName?: string; isContentEditable?: boolean } | null
}

export type UndoAction = 'undo' | 'redo'

const TEXT_TAGS = ['INPUT', 'TEXTAREA', 'SELECT']

/** このキーで図面の Undo・Redo をするか。しなければ null */
export function undoActionOf(e: KeyLike): UndoAction | null {
  if (!(e.ctrlKey || e.metaKey)) return null
  const t = e.target
  if (t && (TEXT_TAGS.includes((t.tagName ?? '').toUpperCase()) || t.isContentEditable === true)) return null
  const k = e.key.toLowerCase()
  if (k === 'z') return e.shiftKey ? 'redo' : 'undo'
  if (k === 'y' && !e.shiftKey) return 'redo'
  return null
}
