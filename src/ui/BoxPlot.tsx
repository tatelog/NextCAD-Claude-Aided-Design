import { useEffect, useRef, useState } from 'react'
import { mmToPx, pxToMm, type Point } from '../geom/viewport'
import { useDrawing } from '../store/drawing'
import { useUi } from '../store/ui'
import { gridStepFor } from '../input/gridSteps'

/** 平面の実寸座標で対角二点を指定する。クリック二回・ドラッグの両方に対応。 */
export function BoxPlot({ onComplete, onCancel }: { onComplete: (a: Point, b: Point) => void; onCancel: () => void }) {
  const viewport = useDrawing(s => s.viewport)
  const [anchor, setAnchor] = useState<Point | null>(null)
  const [hover, setHover] = useState<Point | null>(null)
  const down = useRef<Point | null>(null)
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [onCancel])
  const position = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const p = pxToMm(viewport, { x: e.clientX - rect.left, y: e.clientY - rect.top })
    const step = useUi.getState().inputSnapGrid ? gridStepFor(viewport.mmPerPx).snapMm : 1
    return { x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step }
  }
  const finish = (a: Point, b: Point) => {
    if (Math.abs(a.x - b.x) >= 1 && Math.abs(a.y - b.y) >= 1) onComplete(a, b)
  }
  const a = anchor && mmToPx(viewport, anchor), b = hover && mmToPx(viewport, hover)
  return <svg aria-label="直方体の底面を対角二点で指定" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'crosshair', touchAction: 'none' }}
    onContextMenu={e => { e.preventDefault(); onCancel() }}
    onPointerDown={e => {
      if (e.button !== 0) return
      const p = position(e)
      if (anchor) { finish(anchor, p); return }
      down.current = p; setAnchor(p); setHover(p); e.currentTarget.setPointerCapture(e.pointerId)
    }}
    onPointerMove={e => setHover(position(e))}
    onPointerUp={e => {
      if (!down.current) return
      const p = position(e), start = down.current
      down.current = null
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
      if (Math.hypot(p.x - start.x, p.y - start.y) / viewport.mmPerPx > 4) finish(start, p)
    }}
    onPointerCancel={() => { down.current = null; setAnchor(null); setHover(null) }}>
    {a && b && <>
      <rect x={Math.min(a.x,b.x)} y={Math.min(a.y,b.y)} width={Math.abs(a.x-b.x)} height={Math.abs(a.y-b.y)} fill="#5c8ab522" stroke="#31679b" strokeWidth="1.5" />
      <text x={Math.min(a.x,b.x)+6} y={Math.min(a.y,b.y)-8} fill="#31679b" fontSize="12">{Math.abs(anchor!.x-hover!.x)} × {Math.abs(anchor!.y-hover!.y)} mm</text>
    </>}
  </svg>
}
