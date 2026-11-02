// 描くキャンバス（共通部品）。指・マウス・ペンを Pointer Events で一つに扱い、入力の種類で挙動を変えない。
// 1 本のポインタ = 描く。2 本 = パンとズーム（ピンチ）。ホイール = カーソル位置でズーム。中ボタン／Shift+ドラッグ = パン。
import { useEffect, useMemo, useRef } from 'react'
import { findClosedOutline } from '../canvas/closure'
import { mmToPx, panBy, pxToMm, zoomAt, type Point, type Viewport } from '../geom/viewport'
import type { Node, PenInput, Segment, Stroke } from '../model/schema'
import { DUMMY_SITE_MM, useDrawing } from '../store/drawing'

interface PointerTrack {
  id: number
  last: Point
}

const toPenInput = (type: string): PenInput => (type === 'pen' ? 'pen' : type === 'touch' ? 'touch' : 'mouse')

export function DrawingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewport = useDrawing((s) => s.viewport)
  const setViewport = useDrawing((s) => s.setViewport)
  const addStroke = useDrawing((s) => s.addStroke)
  const entries = useDrawing((s) => s.entries)
  const segments = useMemo(() => entries.flatMap((e) => e.segments), [entries])
  const nodes = useMemo(() => entries.flatMap((e) => e.nodes), [entries])
  const footprint = useMemo(() => {
    const c = findClosedOutline(segments)
    return c.closed ? c.footprint : null
  }, [segments])

  const drawingRef = useRef<{ pointerId: number; pointerType: string; points: Point[] } | null>(null)
  const pointersRef = useRef<Map<number, PointerTrack>>(new Map())
  const panRef = useRef<{ last: Point } | null>(null)
  const viewportRef = useRef(viewport)
  viewportRef.current = viewport

  // 初期表示: ダミー筆界が収まるように原点と倍率を置く（一度だけ）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const siteW = 20_000
    const siteH = 30_000
    const mmPerPx = Math.max(siteW / (rect.width * 0.6), siteH / (rect.height * 0.8))
    setViewport({
      originPx: { x: (rect.width - siteW / mmPerPx) / 2, y: rect.height - (rect.height - siteH / mmPerPx) / 2 },
      mmPerPx,
    })
  }, [setViewport])

  // 状態が変わるたびに描き直す
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    paint(canvas, viewport, segments, nodes, footprint, drawingRef.current?.points ?? null)
  }, [viewport, segments, nodes, footprint])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const local = (e: PointerEvent): Point => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    const repaint = () => paint(canvas, viewportRef.current, segments, nodes, footprint, drawingRef.current?.points ?? null)

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId)
      const p = local(e)
      pointersRef.current.set(e.pointerId, { id: e.pointerId, last: p })
      const isPanButton = e.pointerType === 'mouse' && (e.button === 1 || e.shiftKey)
      if (pointersRef.current.size >= 2) {
        // 2本目が来たら描くのをやめてパン・ズームに切り替える
        drawingRef.current = null
        panRef.current = null
        repaint()
        return
      }
      if (isPanButton) {
        panRef.current = { last: p }
        return
      }
      drawingRef.current = { pointerId: e.pointerId, pointerType: e.pointerType, points: [p] }
    }

    const onMove = (e: PointerEvent) => {
      const p = local(e)
      const track = pointersRef.current.get(e.pointerId)
      if (!track) return
      if (pointersRef.current.size >= 2) {
        const [a, b] = [...pointersRef.current.values()]
        if (!a || !b) return
        const prevA = { ...a.last }
        const prevB = { ...b.last }
        track.last = p
        const nowA = a.last
        const nowB = b.last
        const prevMid = { x: (prevA.x + prevB.x) / 2, y: (prevA.y + prevB.y) / 2 }
        const nowMid = { x: (nowA.x + nowB.x) / 2, y: (nowA.y + nowB.y) / 2 }
        const prevDist = Math.hypot(prevA.x - prevB.x, prevA.y - prevB.y)
        const nowDist = Math.hypot(nowA.x - nowB.x, nowA.y - nowB.y)
        let vp = panBy(viewportRef.current, { x: nowMid.x - prevMid.x, y: nowMid.y - prevMid.y })
        if (prevDist > 0 && nowDist > 0) vp = zoomAt(vp, nowDist / prevDist, nowMid)
        setViewport(vp)
        return
      }
      track.last = p
      if (panRef.current) {
        setViewport(panBy(viewportRef.current, { x: p.x - panRef.current.last.x, y: p.y - panRef.current.last.y }))
        panRef.current.last = p
        return
      }
      const d = drawingRef.current
      if (d && d.pointerId === e.pointerId) {
        d.points.push(p)
        repaint()
      }
    }

    const onUp = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId)
      if (panRef.current) {
        panRef.current = null
        return
      }
      const d = drawingRef.current
      if (!d || d.pointerId !== e.pointerId) return
      drawingRef.current = null
      const vp = viewportRef.current
      const stroke: Stroke = {
        id: crypto.randomUUID(),
        points: d.points.map((q) => ({ px: q.x, py: q.y })),
        view_scale: vp.mmPerPx,
        view_origin: { px: vp.originPx.x, py: vp.originPx.y },
        stage: 'F4',
        pen_mode: 'line',
        created_at: new Date().toISOString(),
        pen_input: toPenInput(d.pointerType),
      }
      addStroke(stroke)
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = canvas.getBoundingClientRect()
      const factor = Math.exp(-e.deltaY * 0.0015)
      setViewport(zoomAt(viewportRef.current, factor, { x: e.clientX - r.left, y: e.clientY - r.top }))
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [addStroke, setViewport, segments, nodes, footprint])

  return <canvas ref={canvasRef} className="drawing-canvas" style={{ touchAction: 'none' }} />
}

function paint(
  canvas: HTMLCanvasElement,
  vp: Viewport,
  segments: Segment[],
  _nodes: Node[],
  footprint: Point[] | null,
  currentPx: Point[] | null,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  const w = rect.width
  const h = rect.height
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#fafaf7'
  ctx.fillRect(0, 0, w, h)

  // 表示グリッド 1000 mm（入力スナップとは別。この一枚ではグリッドのスナップは無い）
  const gridMm = 1000
  const tl = pxToMm(vp, { x: 0, y: 0 })
  const br = pxToMm(vp, { x: w, y: h })
  ctx.strokeStyle = '#e6e4dc'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = Math.floor(Math.min(tl.x, br.x) / gridMm) * gridMm; x <= Math.max(tl.x, br.x); x += gridMm) {
    const p = mmToPx(vp, { x, y: 0 })
    ctx.moveTo(p.x, 0)
    ctx.lineTo(p.x, h)
  }
  for (let y = Math.floor(Math.min(tl.y, br.y) / gridMm) * gridMm; y <= Math.max(tl.y, br.y); y += gridMm) {
    const p = mmToPx(vp, { x: 0, y })
    ctx.moveTo(0, p.y)
    ctx.lineTo(w, p.y)
  }
  ctx.stroke()

  // ダミー筆界
  ctx.strokeStyle = '#8a7f6a'
  ctx.setLineDash([8, 6])
  ctx.lineWidth = 1.5
  ctx.beginPath()
  DUMMY_SITE_MM.forEach((p, i) => {
    const q = mmToPx(vp, p)
    if (i === 0) ctx.moveTo(q.x, q.y)
    else ctx.lineTo(q.x, q.y)
  })
  ctx.closePath()
  ctx.stroke()
  ctx.setLineDash([])

  // 閉じた外形の塗り
  if (footprint && footprint.length >= 3) {
    ctx.fillStyle = 'rgba(46, 125, 50, 0.12)'
    ctx.beginPath()
    footprint.forEach((p, i) => {
      const q = mmToPx(vp, p)
      if (i === 0) ctx.moveTo(q.x, q.y)
      else ctx.lineTo(q.x, q.y)
    })
    ctx.closePath()
    ctx.fill()
  }

  // 整形後の線分
  ctx.strokeStyle = '#1f2a44'
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (const s of segments) {
    const a = mmToPx(vp, { x: s.x1, y: s.y1 })
    const b = mmToPx(vp, { x: s.x2, y: s.y2 })
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
  }
  ctx.stroke()

  // 端点は画面に出さない（2026-11-03 代表）。データとしては持ち、吸着と閉合の検査に使う

  // 描いている最中の軌跡（px のまま）
  if (currentPx && currentPx.length > 1) {
    ctx.strokeStyle = 'rgba(31, 42, 68, 0.45)'
    ctx.lineWidth = 2
    ctx.beginPath()
    currentPx.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.stroke()
  }
}
