// 共通ヘッダーのボタン（代表の依頼 2026-11-06）。文字は出さず、アイコンだけ。名前は aria-label と title に入る（指を置くと名前が出る）。
// 枠は付けない。押せることは CSS（hdr-btn）の、指を置いた・押した時の背景の色で示す。選ばれているものは aria-pressed（背景の色）。
import type { ReactNode } from 'react'

export interface HeaderIconButtonProps {
  /** 名前（今のボタンの文字のまま）。aria-label と title に入る */
  label: string
  /** アイコン（SVG） */
  icon: ReactNode
  onClick?: () => void
  disabled?: boolean
  /** 押されている（選ばれている）か */
  pressed?: boolean
  /** title を名前と違えるとき（押せない理由など）。無ければ名前 */
  title?: string
}

export function HeaderIconButton({ label, icon, onClick, disabled, pressed, title }: HeaderIconButtonProps) {
  return (
    <button
      type="button"
      className="hdr-btn"
      aria-label={label}
      title={title ?? label}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
    </button>
  )
}
