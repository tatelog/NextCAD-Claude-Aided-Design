// ペンの道具（D-04 共通部品「ペンのモード」、G52）。直線／曲線などの作画操作。置き場はハンドルで変更する。
// 置き場は上（ヘッダー）・左（縦の帯）・独立（浮かせる）。独立のときは、道具のハンドルをつかんで動かす。
import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { useUi, type ToolbarPlacement } from '../store/ui'
import { ToolIcon } from './toolIcons'
import { isToolEnabled } from './toolAvailability'
import './pen.css'

// この道具箱は P2（ボリューム作図）に置く。その画面で使えない道具（什器は P3 で使う）はグレーアウトする（G69）
const PEN_SCREEN = 'P2' as const

export interface PenToolbarProps {
  /** 独立のときの位置の基準にする要素（この中で動かす） */
  onClose?: () => void
  onSelect?: () => void
  isSelecting?: boolean
  onPan?: () => void
  onBox?: () => void
  isBox?: boolean
  compact?: boolean
  isDrawing?: boolean
  onDraw?: () => void
  placement: ToolbarPlacement
}

export function PenToolbar({ placement, isDrawing = true, onDraw, onBox, isBox = false, onClose, onPan, onSelect, isSelecting = false, compact = false }: PenToolbarProps) {
  const penMode = useUi((s) => s.penMode)
  const setPenMode = useUi((s) => s.setPenMode)
  const arcTwoPoint = useUi((s) => s.arcTwoPoint)
  const setArcTwoPoint = useUi((s) => s.setArcTwoPoint)
  const setToolbarPlacement = useUi((s) => s.setToolbarPlacement)
  const freePosition = useUi((s) => s.freePosition)
  const setFreePosition = useUi((s) => s.setFreePosition)
  const displayGrid = useUi((s) => s.displayGrid)
  const setDisplayGrid = useUi((s) => s.setDisplayGrid)
  const inputSnapGrid = useUi((s) => s.inputSnapGrid)
  const setInputSnapGrid = useUi((s) => s.setInputSnapGrid)

  // 独立のハンドル: つかんだ点からの移動量を足す
  const drag = useRef<{ start: { x: number; y: number }; origin: { x: number; y: number } } | null>(null)
  const onHandleDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { start: { x: e.clientX, y: e.clientY }, origin: placement === 'free' ? freePosition : (() => {
      const rect = e.currentTarget.closest('.pen-toolbar')!.getBoundingClientRect()
      const body = e.currentTarget.closest('.p03')?.querySelector('.p03-body')?.getBoundingClientRect()
      return {x: rect.left - (body?.left ?? 0), y: rect.top - (body?.top ?? 0)}
    })() }
  }
  const onHandleMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d) return
    setFreePosition({ x: d.origin.x + (e.clientX - d.start.x), y: d.origin.y + (e.clientY - d.start.y) })
  }
  const onHandleUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (drag.current) {
      const d = drag.current
      setFreePosition({x: Math.max(0,d.origin.x+e.clientX-d.start.x), y: Math.max(0,d.origin.y+e.clientY-d.start.y)})
      setToolbarPlacement('free')
    }
    drag.current = null
  }

  const style = placement === 'free' ? (compact ? {position:'relative' as const,left:0,top:0} : { left: freePosition.x, top: freePosition.y }) : placement === 'left' ? { width: 44, flexShrink: 0, position: 'relative' as const, boxSizing: 'border-box' as const } : undefined

  return (
    <div className={`pen-toolbar is-${placement}`} style={style} role="toolbar" aria-label="ペンの道具">
      {!compact && (
        <button
          type="button"
          className="pen-toolbar-handle"
          title="つかんで動かす"
          aria-label="つかんで動かす"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
          <span className="pen-grip-bar" />
        </button>
      )}
      {!compact && onClose && <button type="button" className="pen-toolbar-close" aria-label="作図ツールを閉じる" title="閉じる" onClick={onClose}>×</button>}
      {onPan && <span className="pen-toolbar-group" role="group" aria-label="操作モード">
        <button type="button" title="作図" aria-label="作図" aria-pressed={isDrawing} className={isDrawing?'is-active':undefined} onClick={onDraw}><ToolIcon name="pencil" /></button>
        <button type="button" title="パン" aria-label="パン" aria-pressed={!isDrawing && !isSelecting} className={!isDrawing && !isSelecting?'is-active':undefined} onClick={onPan}><ToolIcon name="hand" /></button>
      </span>}
      {onSelect && <><span className="pen-toolbar-separator" role="separator" /><button type="button" title="選択：図形を移動・ハンドルで修正" aria-label="選択" aria-pressed={isSelecting} className={isSelecting ? 'is-active' : undefined} onClick={onSelect}><ToolIcon name="cursor" /></button></>}
      {onBox && <button type="button" aria-label="四角形" title="平面に四角形を描く（対角2点・Tabで寸法入力）" aria-pressed={isBox} className={isBox ? 'is-active' : undefined} onClick={onBox}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10"/></svg></button>}
      <span className="pen-toolbar-group">
        <button type="button" aria-label="直線" title="2点を選んで直線を描く（Shiftで水平・垂直、Escで取消）" className={isDrawing && !isSelecting && !isBox && penMode === 'line' ? 'is-active' : undefined} aria-pressed={isDrawing && !isSelecting && !isBox && penMode === 'line'} onClick={() => { onDraw?.(); setPenMode('line') }}>
          <ToolIcon name="line" />
        </button>
        <button type="button" aria-label="曲線" title="曲線を描く" className={isDrawing && !isSelecting && !isBox && penMode === 'curve' ? 'is-active' : undefined} aria-pressed={isDrawing && !isSelecting && !isBox && penMode === 'curve'} onClick={() => { onDraw?.(); setPenMode('curve') }}>
          <ToolIcon name="curve" />
        </button>
        {/* 二点の円弧（t70）は曲線モードの中の道具。押すと、二点を押してから中心線上を動かして中心を決める */}
        {isDrawing && !isSelecting && !isBox && penMode === 'curve' && (
          <button
            type="button"
            aria-label="円弧（二点）"
            title="二点と中心位置から円弧を描く"
            className={arcTwoPoint ? 'is-active' : undefined}
            aria-pressed={arcTwoPoint}
            onClick={() => setArcTwoPoint(!arcTwoPoint)}
          >
            <ToolIcon name="curve" />
          </button>
        )}
      </span>
      <span className="pen-toolbar-group" title="表示グリッドと入力スナップは別の設定（吸着に使うのは入力スナップだけ）">
        <button type="button" aria-label="表示グリッド" title="作図用グリッドの表示を切り替える" className={displayGrid ? 'is-active' : undefined} aria-pressed={displayGrid} onClick={() => setDisplayGrid(!displayGrid)}>
          <ToolIcon name="grid" />
        </button>
        <button type="button" aria-label="入力スナップ" title="描画する点をグリッドに吸着させる" className={inputSnapGrid ? 'is-active' : undefined} aria-pressed={inputSnapGrid} onClick={() => setInputSnapGrid(!inputSnapGrid)}>
          <ToolIcon name="snap" />
        </button>
      </span>
      <span className="pen-toolbar-group" title="什器は平面で使う（ボリュームでは使えない）">
        <button
          type="button"
          aria-label="什器"
          title={isToolEnabled('fixture', PEN_SCREEN) ? '什器' : '什器（平面で使う）'}
          disabled={!isToolEnabled('fixture', PEN_SCREEN)}
        >
          <ToolIcon name="fixture" />
        </button>
      </span>
    </div>
  )
}
