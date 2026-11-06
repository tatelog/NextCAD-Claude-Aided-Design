import { LeftPanelResize, useLeftPanelWidth } from './LeftPanelResize'
// ペンの道具（D-04 共通部品「ペンのモード」、G52）。直線／曲線、Undo／Redo、置き場（上・左・独立）の切替。
// 置き場は上（ヘッダー）・左（縦の帯）・独立（浮かせる）。独立のときは、道具のハンドルをつかんで動かす。
import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { useUi, type ToolbarPlacement } from '../store/ui'
import { ToolIcon } from './toolIcons'
import { isToolEnabled } from './toolAvailability'
import './pen.css'

const PLACEMENTS: { value: ToolbarPlacement; label: string; icon: 'place-top' | 'place-left' | 'place-free' }[] = [
  { value: 'top', label: '上', icon: 'place-top' },
  { value: 'left', label: '左', icon: 'place-left' },
  { value: 'free', label: '独立', icon: 'place-free' },
]

// この道具箱は P2（ボリューム作図）に置く。その画面で使えない道具（什器は P3 で使う）はグレーアウトする（G69）
const PEN_SCREEN = 'P2' as const

export interface PenToolbarProps {
  /** 独立のときの位置の基準にする要素（この中で動かす） */
  compact?: boolean
  isDrawing?: boolean
  onDraw?: () => void
  placement: ToolbarPlacement
}

export function PenToolbar({ placement, isDrawing = true, onDraw, compact = false }: PenToolbarProps) {
  const leftWidth = useLeftPanelWidth((s) => s.width)
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

  const style = placement === 'free' ? (compact ? {position:'relative' as const,left:0,top:0} : { left: freePosition.x, top: freePosition.y }) : placement === 'left' ? { width: compact ? 140 : leftWidth, flexShrink: 0, position: 'relative' as const, boxSizing: 'border-box' as const } : undefined

  return (
    <div className={`pen-toolbar is-${placement}`} style={style} role="toolbar" aria-label="ペンの道具">
      {placement === 'left' && !compact && <LeftPanelResize />}
      {placement === 'free' && !compact && (
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
          <ToolIcon name="grip" />
        </button>
      )}
      <span className="pen-toolbar-group">
        <button type="button" aria-label="直線" title="直線" className={isDrawing && penMode === 'line' ? 'is-active' : undefined} aria-pressed={isDrawing && penMode === 'line'} onClick={() => { onDraw?.(); setPenMode('line') }}>
          <ToolIcon name="line" />
          <span>直線</span>
        </button>
        <button type="button" aria-label="曲線" title="曲線" className={isDrawing && penMode === 'curve' ? 'is-active' : undefined} aria-pressed={isDrawing && penMode === 'curve'} onClick={() => { onDraw?.(); setPenMode('curve') }}>
          <ToolIcon name="curve" />
          <span>曲線</span>
        </button>
        {/* 二点の円弧（t70）は曲線モードの中の道具。押すと、二点を押してから中心線上を動かして中心を決める */}
        {isDrawing && penMode === 'curve' && (
          <button
            type="button"
            aria-label="円弧（二点）"
            title="円弧（二点）"
            className={arcTwoPoint ? 'is-active' : undefined}
            aria-pressed={arcTwoPoint}
            onClick={() => setArcTwoPoint(!arcTwoPoint)}
          >
            <ToolIcon name="curve" />
            <span>円弧（二点）</span>
          </button>
        )}
      </span>
      <span className="pen-toolbar-group" title="表示グリッドと入力スナップは別の設定（吸着に使うのは入力スナップだけ）">
        <button type="button" aria-label="表示グリッド" title="表示グリッド" className={displayGrid ? 'is-active' : undefined} aria-pressed={displayGrid} onClick={() => setDisplayGrid(!displayGrid)}>
          <ToolIcon name="grid" />
          <span>表示グリッド</span>
        </button>
        <button type="button" aria-label="入力スナップ" title="入力スナップ" className={inputSnapGrid ? 'is-active' : undefined} aria-pressed={inputSnapGrid} onClick={() => setInputSnapGrid(!inputSnapGrid)}>
          <ToolIcon name="snap" />
          <span>入力スナップ</span>
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
          <span>什器</span>
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
            aria-label={p.label}
            title={`置き場: ${p.label}`}
          >
            <ToolIcon name={p.icon} />
            <span>{p.label}</span>
          </button>
        ))}
      </span>
    </div>
  )
}
