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
  const [editing, setEditing] = useState<'width' | 'height' | null>(null)
  const [dimensions, setDimensions] = useState({ width: '', height: '' })
  const widthInput = useRef<HTMLInputElement>(null)
  const heightInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const input = editing === 'width' ? widthInput.current : editing === 'height' ? heightInput.current : null
    input?.focus(); input?.select()
  }, [editing])
  const down = useRef<Point | null>(null)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); return }
      if (e.key !== 'Tab' || !anchor || !hover) return
      e.preventDefault()
      if (!editing) setDimensions({ width: String(Math.abs(anchor.x-hover.x)), height: String(Math.abs(anchor.y-hover.y)) })
      setEditing(editing === 'width' ? 'height' : editing === 'height' ? 'width' : e.shiftKey ? 'height' : 'width')
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onCancel, anchor, hover, editing])
  const numericPoint = (): Point | null => {
    if (!anchor || !hover) return null
    const w = Number(dimensions.width), h = Number(dimensions.height)
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) return null
    return { x: anchor.x + (hover.x < anchor.x ? -1 : 1) * w, y: anchor.y + (hover.y < anchor.y ? -1 : 1) * h }
  }
  const shown = editing ? numericPoint() ?? hover : hover
  const position = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const p = pxToMm(viewport, { x: e.clientX - rect.left, y: e.clientY - rect.top })
    const step = useUi.getState().inputSnapGrid ? gridStepFor(viewport.mmPerPx).snapMm : 1
    return { x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step }
  }
  const finish = (a: Point, b: Point) => {
    if (Math.abs(a.x - b.x) >= 1 && Math.abs(a.y - b.y) >= 1) onComplete(a, b)
  }
  const a = anchor && mmToPx(viewport, anchor), b = shown && mmToPx(viewport, shown)
  return <><svg tabIndex={0} aria-label="直方体の底面を対角二点で指定" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'crosshair', touchAction: 'none' }}
    onContextMenu={e => { e.preventDefault(); onCancel() }}
    onPointerDown={e => {
      if (e.button !== 0 || editing) return
      const p = position(e)
      if (anchor) { finish(anchor, p); return }
      e.currentTarget.focus(); down.current = p; setAnchor(p); setHover(p); e.currentTarget.setPointerCapture(e.pointerId)
    }}
    onPointerMove={e => { if (!editing) setHover(position(e)) }}
    onPointerUp={e => {
      if (editing) { down.current = null; return }
      if (!down.current) return
      const p = position(e), start = down.current
      down.current = null
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
      if (Math.hypot(p.x - start.x, p.y - start.y) / viewport.mmPerPx > 4) finish(start, p)
    }}
    onPointerCancel={() => { down.current = null; setAnchor(null); setHover(null) }}>
    {a && b && <>
      <rect x={Math.min(a.x,b.x)} y={Math.min(a.y,b.y)} width={Math.abs(a.x-b.x)} height={Math.abs(a.y-b.y)} fill="#5c8ab522" stroke="#31679b" strokeWidth="1.5" />
      <text x={Math.min(a.x,b.x)+6} y={Math.min(a.y,b.y)-8} fill="#31679b" fontSize="12">{Math.abs(anchor!.x-shown!.x)} × {Math.abs(anchor!.y-shown!.y)} mm{!editing && " · Tabで寸法入力"}</text>
    </>}
  </svg>
  {editing && a && b && <form aria-label="オブジェクトの寸法入力" style={{ position: 'absolute', left: `clamp(8px, ${Math.min(a.x,b.x)}px, calc(100% - 310px))`, top: Math.max(8, Math.min(a.y,b.y)-58), background: '#fff', padding: 6, display: 'flex', gap: 6, alignItems: 'center', zIndex: 2 }}
    onSubmit={e => { e.preventDefault(); const point = numericPoint(); if (anchor && point) finish(anchor, point) }}>
    <label>横 <input ref={widthInput} aria-label="横寸法（mm）" type="number" min="1" step="any" required value={dimensions.width} onFocus={() => setEditing('width')} onChange={e => setDimensions(d => ({ ...d, width: e.target.value }))} style={{ width: 75 }} /></label>
    <span>×</span>
    <label>縦 <input ref={heightInput} aria-label="縦寸法（mm）" type="number" min="1" step="any" required value={dimensions.height} onFocus={() => setEditing('height')} onChange={e => setDimensions(d => ({ ...d, height: e.target.value }))} style={{ width: 75 }} /></label>
    <span>mm</span><button type="submit">確定</button>
  </form>}
  </>
}
