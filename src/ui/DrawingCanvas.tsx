// 描くキャンバス（共通部品）。指・マウス・ペンを Pointer Events で一つに扱い、入力の種類で挙動を変えない（G23）。
// 振り分けは input/gesture.ts（本数と中ボタン・Shift だけ見る）。1 本 = 描く。2 本 = パンとズーム。
// ホイール = カーソル位置でズーム。中ボタン／Shift + ドラッグ = パン。ダブルタップ・右クリック = サークルメニュー（G52）。
import { useEffect, useMemo, useRef } from 'react'
import { findClosedOutline } from '../canvas/closure'
import { applyPinch, classifyPointerDown, pinchStep, wheelZoomFactor } from '../input/gesture'
import { nextTap, type TapRecord } from '../input/tap'
import { mmToPx, pxToMm, zoomAt, type Point, type Viewport } from '../geom/viewport'
import type { Node, Segment, Stroke } from '../model/schema'
import { DUMMY_SITE_MM, useDrawing } from '../store/drawing'
import { useUi } from '../store/ui'

interface PointerTrack {
  id: number
  last: Point
}

/** 入力スナップのグリッド（mm）。表示グリッドとは別。仮置き 1000 */
const INPUT_GRID_MM = 1000

const toPenInput = (type: string): Stroke['pen_input'] => (type === 'pen' ? 'pen' : type === 'touch' ? 'touch' : 'mouse')

export function DrawingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewport = useDrawing((s) => s.viewport)
  const setViewport = useDrawing((s) => s.setViewport)
  const fitViewport = useDrawing((s) => s.fitViewport)
  const addStroke = useDrawing((s) => s.addStroke)
  const entries = useDrawing((s) => s.entries)
  const displayGrid = useUi((s) => s.displayGrid)
  const openCircleMenu = useUi((s) => s.openCircleMenu)
  const segments = useMemo(() => entries.flatMap((e) => e.segments), [entries])
  const nodes = useMemo(() => entries.flatMap((e) => e.nodes), [entries])
  const footprint = useMemo(() => {
    const c = findClosedOutline(segments)
    return c.closed ? c.footprint : null
  }, [segments])

  const drawingRef = useRef<{ pointerId: number; pointerType: string; points: Point[] } | null>(null)
  const pointersRef = useRef<Map<number, PointerTrack>>(new Map())
  const panRef = useRef<{ last: Point } | null>(null)
  const lastTapRef = useRef<TapRecord | null>(null)
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
    fitViewport({
      originPx: { x: (rect.width - siteW / mmPerPx) / 2, y: rect.height - (rect.height - siteH / mmPerPx) / 2 },
      mmPerPx,
    })
  }, [fitViewport])

  // 状態が変わるたびに描き直す
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    paint(canvas, viewport, segments, nodes, footprint, drawingRef.current?.points ?? null, displayGrid)
  }, [viewport, segments, nodes, footprint, displayGrid])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const local = (e: PointerEvent | MouseEvent): Point => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    const repaint = () =>
      paint(canvas, viewportRef.current, segments, nodes, footprint, drawingRef.current?.points ?? null, displayGrid)

    const onDown = (e: PointerEvent) => {
      const p = local(e)
      const intent = classifyPointerDown({
        pointerType: e.pointerType,
        button: e.button,
        shiftKey: e.shiftKey,
        activeCount: pointersRef.current.size + 1,
      })
      // 右クリックは描かない（サークルメニューは contextmenu で開く）
      if (intent === 'none') return
      // サークルメニューが開いているときの押下は、メニューを閉じるだけ（線は描かない）
      if (useUi.getState().circleMenu) {
        useUi.getState().closeCircleMenu()
        return
      }
      canvas.setPointerCapture(e.pointerId)
      pointersRef.current.set(e.pointerId, { id: e.pointerId, last: p })
      if (intent === 'pan-zoom') {
        // 2 本目が来たら描くのをやめてパン・ズームに切り替える
        drawingRef.current = null
        panRef.current = null
        repaint()
        return
      }
      if (intent === 'pan') {
        panRef.current = { last: p }
        return
      }
      // ダブルタップは、描かずにサークルメニューを出す（G52）
      const tap = nextTap(lastTapRef.current, { t: e.timeStamp, x: p.x, y: p.y })
      lastTapRef.current = tap.next
      if (tap.double) {
        drawingRef.current = null
        openCircleMenu(p)
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
        // 動いた指の前の位置を使って、2 本の指の前後を作る
        const prevPos = track.last
        const prevPair: [Point, Point] = [a === track ? prevPos : a.last, b === track ? prevPos : b.last]
        track.last = p
        setViewport(applyPinch(viewportRef.current, pinchStep(prevPair, [a.last, b.last])))
        return
      }
      track.last = p
      if (panRef.current) {
        const vp = viewportRef.current
        setViewport({
          ...vp,
          originPx: {
            x: vp.originPx.x + (p.x - panRef.current.last.x),
            y: vp.originPx.y + (p.y - panRef.current.last.y),
          },
        })
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
      const ui = useUi.getState()
      const stroke: Stroke = {
        id: crypto.randomUUID(),
        points: d.points.map((q) => ({ px: q.x, py: q.y })),
        view_scale: vp.mmPerPx,
        view_origin: { px: vp.originPx.x, py: vp.originPx.y },
        stage: 'F4',
        pen_mode: ui.penMode,
        created_at: new Date().toISOString(),
        pen_input: toPenInput(d.pointerType),
      }
      addStroke(stroke, ui.inputSnapGrid ? INPUT_GRID_MM : null)
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      // 描いている途中の拡大・縮小は、描きかけの線を捨てる（点の座標と表示の倍率が食い違うため）
      drawingRef.current = null
      setViewport(zoomAt(viewportRef.current, wheelZoomFactor(e.deltaY), local(e)))
    }

    // キャンセル（OS がジェスチャを奪った等）は、描きかけの線を確定せずに捨てる
    const onCancel = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId)
      if (drawingRef.current?.pointerId === e.pointerId) drawingRef.current = null
      panRef.current = null
      repaint()
    }

    // 右クリックはサークルメニュー（G52）。ブラウザの既定のメニューは出さない
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      openCircleMenu(local(e))
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onCancel)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('contextmenu', onContextMenu)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onCancel)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', onContextMenu)
    }
  }, [addStroke, setViewport, openCircleMenu, segments, nodes, footprint, displayGrid])

  return <canvas ref={canvasRef} className="drawing-canvas" style={{ touchAction: 'none' }} />
}

function paint(
  canvas: HTMLCanvasElement,
  vp: Viewport,
  segments: Segment[],
  _nodes: Node[],
  footprint: Point[] | null,
  currentPx: Point[] | null,
  showGrid: boolean,
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

  // 表示グリッド 1000 mm（入力スナップとは別。表示だけで吸着には使わない）
  if (showGrid) {
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
  }

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

  // 整形後の線分。曲線は制御点を通る折れ線で描く（見た目だけ。正本は制御点）
  ctx.strokeStyle = '#1f2a44'
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (const s of segments) {
    const pts = s.curve === 'spline' && s.curve_params ? (s.curve_params.control_points as Point[]) : null
    if (pts && pts.length > 1) {
      pts.forEach((p, i) => {
        const q = mmToPx(vp, p)
        if (i === 0) ctx.moveTo(q.x, q.y)
        else ctx.lineTo(q.x, q.y)
      })
      continue
    }
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
