// 共通ヘッダーの状態の表示（代表の依頼 2026-11-06）。文字は出さず、保存は色の点、保留は小さなアイコンと数字。名前は aria-label と title に入る。
import { IconPending } from './headerIcons'

/** 保存の状態（色の点。保存済みは灰、未保存の変更ありは橙）。名前は状態の文 */
export function SaveDot({ status }: { status: string }) {
  const saved = status === '保存済み'
  return (
    <span
      role="status"
      aria-label={status}
      title={status}
      className="hdr-dot"
      style={{ background: saved ? '#5b6670' : '#a86b00' }}
    />
  )
}

/** 保留の件数（小さなアイコンと数字。見えるのは数字だけ） */
export function PendingIndicator({ count }: { count: number }) {
  return (
    <span
      role="status"
      aria-label={`保留 ${count} 件`}
      title="Claude の判定で、再試行しても失敗したもの（保留の一覧）"
      className="hdr-status"
    >
      <IconPending />
      <span aria-hidden="true">{count}</span>
    </span>
  )
}
