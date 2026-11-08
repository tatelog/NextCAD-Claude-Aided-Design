import { useRef } from 'react'
import { create } from 'zustand'

export const useLeftPanelWidth = create<{ width: number; setWidth: (width: number) => void }>((set) => ({
  width: 240,
  setWidth: (width) => set({ width: Math.max(180, Math.min(480, width)) }),
}))

export function LeftPanelResize() {
  const { width, setWidth } = useLeftPanelWidth()
  const drag = useRef<{ x: number; width: number } | null>(null)
  return <div role="separator" aria-label="左メニューの幅" aria-orientation="vertical"
    aria-valuemin={180} aria-valuemax={480} aria-valuenow={width} tabIndex={0}
    className="left-panel-resize" title="ドラッグで左メニューの幅を変更"
    onPointerDown={(e) => {
      if (e.button !== 0) return
      e.preventDefault()
      drag.current = { x: e.clientX, width }
      e.currentTarget.setPointerCapture(e.pointerId)
    }}
    onPointerMove={(e) => { if (drag.current) setWidth(drag.current.width + e.clientX - drag.current.x) }}
    onPointerUp={(e) => { drag.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) }}
    onPointerCancel={() => { drag.current = null }}
    onLostPointerCapture={() => { drag.current = null }}
    onKeyDown={(e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      setWidth(width + (e.key === 'ArrowRight' ? 16 : -16))
    }} />
}
