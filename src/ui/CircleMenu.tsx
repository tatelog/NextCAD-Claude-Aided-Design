import { ToolIcon, type TOOL_ICONS } from './toolIcons'
// サークルメニュー（G52）。右クリックかダブルタップで、その位置に同じ道具を出す。
// 押した道具を使ったら閉じる。外側を押しても閉じる（呼び出し側の canvas が閉じる）。
import { useDrawing } from '../store/drawing'
import { useUi } from '../store/ui'
import './pen.css'

export function CircleMenu({onDraw,onPan,onSelect,onBox,isDrawing,isPanning,isSelecting,isBox}:{onDraw:()=>void;onPan:()=>void;onSelect:()=>void;onBox:()=>void;isDrawing:boolean;isPanning:boolean;isSelecting:boolean;isBox:boolean}) {
  const at = useUi((s) => s.circleMenu)
  const close = useUi((s) => s.closeCircleMenu)
  const setPenMode = useUi((s) => s.setPenMode)
  const penMode = useUi((s) => s.penMode)
  const undo = useDrawing((s) => s.undo)
  const redo = useDrawing((s) => s.redo)
  const canUndo = useDrawing((s) => s.past.length > 0)
  const canRedo = useDrawing((s) => s.redoStack.length > 0)
  if (!at) return null

  const items: { label: string; run: () => void; active?: boolean; icon: keyof typeof TOOL_ICONS; disabled?: boolean }[] = [
    { label: '作画モード', icon: 'pencil', run: onDraw, active: isDrawing },
    { label: 'パンモード', icon: 'hand', run: onPan, active: isPanning },
    { label: '選択', icon: 'cursor', run: onSelect, active: isSelecting },
    { label: '立体', icon: 'box', run: onBox, active: isBox },
    { label: '直線', icon: 'line', run: () => {onDraw();setPenMode('line')}, active: isDrawing && penMode === 'line' },
    { label: '曲線', icon: 'curve', run: () => {onDraw();setPenMode('curve')}, active: isDrawing && penMode === 'curve' },
    { label: 'Undo', icon: 'undo', run: undo, disabled: !canUndo },
    { label: 'Redo', icon: 'redo', run: redo, disabled: !canRedo },
  ]

  return (
    <div className="circle-menu" role="menu" aria-label="作図のサークルメニュー" style={{ left: `clamp(148px, ${at.x}px, calc(100% - 148px))`, top: `clamp(148px, ${at.y}px, calc(100% - 148px))` }} onKeyDown={(e) => { if (e.key === 'Escape') close() }} onPointerDown={(e) => e.stopPropagation()}>
      {items.map((it, i) => (
        <button
          key={it.label}
          type="button"
          role="menuitem"
          className={it.active ? 'circle-menu-item is-active' : 'circle-menu-item'}
          disabled={it.disabled}
          style={{ left: `${50 + 37 * Math.cos((-90 + i * (360 / items.length)) * Math.PI / 180)}%`, top: `${50 + 37 * Math.sin((-90 + i * (360 / items.length)) * Math.PI / 180)}%` }}
          onClick={() => {
            it.run()
            close()
          }}
        >
          <ToolIcon name={it.icon} />
          <span>{it.label}</span>
        </button>
      ))}
      <button type="button" role="menuitem" className="circle-menu-close" aria-label="閉じる" title="閉じる" onClick={close}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </div>
  )
}
