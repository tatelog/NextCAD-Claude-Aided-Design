// ペンの道具（D-04 共通部品「ペンのモード」、G52）。直線／曲線、Undo／Redo、置き場（上・左・独立）の切替。
// 置き場は上（ヘッダー）・左（縦の帯）・独立（浮かせる）。独立のときは、道具のハンドルをつかんで動かす。
import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { useDrawing } from '../store/drawing'
import { useUi, type ToolbarPlacement } from '../store/ui'
import './pen.css'

const PLACEMENTS: { value: ToolbarPlacement; label: string }[] = [
  { value: 'top', label: '上' },
  { value: 'left', label: '左' },
  { value: 'free', label: '独立' },
]

export interface PenToolbarProps {
  /** 独立のときの位置の基準にする要素（この中で動かす） */
  placement: ToolbarPlacement
}

export function PenToolbar({ placement }: PenToolbarProps) {
  const penMode = useUi((s) => s.penMode)
  const setPenMode = useUi((s) => s.setPenMode)
  const setToolbarPlacement = useUi((s) => s.setToolbarPlacement)
  const freePosition = useUi((s) => s.freePosition)
  const setFreePosition = useUi((s) => s.setFreePosition)
  const displayGrid = useUi((s) => s.displayGrid)
  const setDisplayGrid = useUi((s) => s.setDisplayGrid)
  const inputSnapGrid = useUi((s) => s.inputSnapGrid)
  const setInputSnapGrid = useUi((s) => s.setInputSnapGrid)
  const undo = useDrawing((s) => s.undo)
  const redo = useDrawing((s) => s.redo)
  const canUndo = useDrawing((s) => s.past.length > 0)
  const canRedo = useDrawing((s) => s.redoStack.length > 0)

  // 独立のハンドル: つかんだ点からの移動量を足す
  const drag = useRef<{ start: { x: number; y: number }; origin: { x: number; y: number } } | null>(null)
  const onHandleDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { start: { x: e.clientX, y: e.clientY }, origin: freePosition }
  }
  const onHandleMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d) return
    setFreePosition({ x: d.origin.x + (e.clientX - d.start.x), y: d.origin.y + (e.clientY - d.start.y) })
  }
  const onHandleUp = () => {
    drag.current = null
  }

  const style = placement === 'free' ? { left: freePosition.x, top: freePosition.y } : undefined

  return (
    <div className={`pen-toolbar is-${placement}`} style={style} role="toolbar" aria-label="ペンの道具">
      {placement === 'free' && (
        <button
          type="button"
          className="pen-toolbar-handle"
          title="つかんで動かす"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
          ⠿
        </button>
      )}
      <span className="pen-toolbar-group">
        <button type="button" className={penMode === 'line' ? 'is-active' : undefined} aria-pressed={penMode === 'line'} onClick={() => setPenMode('line')}>
          直線
        </button>
        <button type="button" className={penMode === 'curve' ? 'is-active' : undefined} aria-pressed={penMode === 'curve'} onClick={() => setPenMode('curve')}>
          曲線
        </button>
      </span>
      <span className="pen-toolbar-group">
        <button type="button" onClick={undo} disabled={!canUndo}>
          Undo
        </button>
        <button type="button" onClick={redo} disabled={!canRedo}>
          Redo
        </button>
      </span>
      <span className="pen-toolbar-group" title="表示グリッドと入力スナップは別の設定（吸着に使うのは入力スナップだけ）">
        <button type="button" className={displayGrid ? 'is-active' : undefined} aria-pressed={displayGrid} onClick={() => setDisplayGrid(!displayGrid)}>
          表示グリッド
        </button>
        <button type="button" className={inputSnapGrid ? 'is-active' : undefined} aria-pressed={inputSnapGrid} onClick={() => setInputSnapGrid(!inputSnapGrid)}>
          入力スナップ
        </button>
      </span>
      <span className="pen-toolbar-group" title="道具の置き場">
        {PLACEMENTS.map((p) => (
          <button
            key={p.value}
            type="button"
            className={placement === p.value ? 'is-active' : undefined}
            aria-pressed={placement === p.value}
            onClick={() => setToolbarPlacement(p.value)}
          >
            {p.label}
          </button>
        ))}
      </span>
    </div>
  )
}
