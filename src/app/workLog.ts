// 作業履歴（モックのヘッダーの「作業履歴」）。画面の中だけで持つ。SQLite への保存は未接続。
export interface LogEntry {
  /** 時刻（ISO 形式） */
  at: string
  /** 画面（P1〜P5） */
  screen: string
  /** 操作（例: 切替、保存、表示） */
  action: string
  /** 対象 */
  target: string
}

export const LOG_LIMIT = 200

export function appendLog(log: readonly LogEntry[], entry: LogEntry, limit: number = LOG_LIMIT): LogEntry[] {
  return [entry, ...log].slice(0, limit)
}
