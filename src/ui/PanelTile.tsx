// 右パネルのタイル（ハブ A-03 G73）。タイトルの右上に小さな × を置き、押すと onHide を呼ぶ（閉じるのは呼び出し側が決める）。
import type { ReactNode } from 'react'

export interface PanelTileProps {
  title: string
  /** × を押したとき。閉じた状態は呼び出し側（ストア）が持つ */
  onHide: () => void
  children?: ReactNode
}

export function PanelTile({ title, onHide, children }: PanelTileProps) {
  return (
    <div style={{ position: 'relative', marginBottom: 10 }}>
      <button
        type="button"
        aria-label={`${title}を閉じる`}
        onClick={onHide}
        style={{ position: 'absolute', top: 0, right: 0, border: 0, background: 'transparent', color: '#888', font: 'inherit', fontSize: 12, cursor: 'pointer', padding: '0 2px' }}
      >
        ×
      </button>
      {children}
    </div>
  )
}
