// P3 の描く画面（D-04 P3、D-02 C1、G152）。ドラッグで線を描き、線分にして（strokeToSegments）、閉合を表示する（findClosedOutline）。
// 直線モードは直線に整形し、曲線モードは曲線のまま残す（P2 と同じペンのモード。store の penMode）。
// 曲線モードの「円弧（二点）」（t81・G152。P2 と同じ道具）: 二点を押し、中心線上を動かして中心を決め、押して確定する。
// 描画の入力は setPointerCapture を使わない（合成イベントでも確かめられるように）。描画の共通部品（DrawingCanvas）には触れない。
import { useEffect, useMemo, useRef, useState } from 'react'
import { findClosedOutline } from '../canvas/closure'
import { polylineOfSegment } from '../canvas/arcSegment'
import { strokeStartPx } from '../input/endpointPick'
import { arcPreviewMm, arcToolStep, ARC_TOOL_START, type ArcToolState } from '../input/twoPointArcTool'
import type { Stroke } from '../model/schema'
import { p3Entries, useDrawing } from '../store/drawing'
import { useUi } from '../store/ui'
import { useMode } from '../store/mode'
import { useSelection } from '../store/selection'
import { isTapMove, segmentPickAt, strokeColorOf } from '../canvas/segmentPick'
import { P3_H, P3_MM_PER_PX, P3_VIEWPORT, P3_W, p3ArcStroke, p3MmToPx, p3PxToMm } from './p3CanvasGeometry'
import { p3StrokeOfTrail } from './p3TrailStroke'

// 表示の原点（画面の中央）
const OX = P3_VIEWPORT.originPx.x
/** チャットのモードのタップと動いたを分ける距離（px）（G159） */
const CHAT_TAP_PX = 6
/** タップで線を選ぶときの当たりの距離（px）（G159） */
const SELECT_PX = 8
const OY = P3_VIEWPORT.originPx.y


/** 二点の円弧の道具（t81）が選ばれているか。P2 と同じ store の値 */
const arcOn = () => {
  const u = useUi.getState()
  return u.penMode === 'curve' && u.arcTwoPoint
}

export function P3Canvas({ viewBox, overlay = false, drawing = true }: {
  viewBox?: { x: number; y: number; width: number; height: number }
  overlay?: boolean
  drawing?: boolean
} = {}) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  // P3 の線は店舗の線（P3 の印つき）。表示・吸着・閉合は P3 の線だけを見る（P2 の外形は P3 の平面が別に描く）
  const drawn = useDrawing((s) => s.entries)
  const segments = useMemo(() => p3Entries(drawn).flatMap((e) => e.segments), [drawn])
  const nodes = useMemo(() => p3Entries(drawn).flatMap((e) => e.nodes), [drawn])
  const [trail, setTrail] = useState<{ x: number; y: number }[] | null>(null)
  // チャットのモードのタップの途中（G159）。動かさずに離したら選ぶ
  const chatTapRef = useRef<{ pointerId: number; x: number; y: number; moved: boolean } | null>(null)
  // 選んでいる線（色を変える。G159）
  const selectedIds = useSelection((s) => s.segmentIds)
  /** 二点の円弧の道具の状態（t81）。道具を外したら一点目の待ちに戻る */
  const arcRef = useRef<ArcToolState>(ARC_TOOL_START)
  const arcTwoPoint = useUi((s) => s.arcTwoPoint)
  useEffect(() => {
    arcRef.current = ARC_TOOL_START
  }, [arcTwoPoint])

  // 描いた線（直線は線分、曲線は制御点を通る線）と、描いている途中の軌跡・道具のプレビューを描く
  useEffect(() => {
    const c = ref.current
    const g = c?.getContext('2d')
    if (!c || !g) return
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, P3_W, P3_H)
    if (viewBox) {
      // 保存座標は従来どおり mm・上向き。図面の SVG は下向き。
      const sx = P3_W / viewBox.width, sy = P3_H / viewBox.height
      g.setTransform(P3_MM_PER_PX * sx, 0, 0, P3_MM_PER_PX * sy,
        (-OX * P3_MM_PER_PX - viewBox.x) * sx,
        (-OY * P3_MM_PER_PX - viewBox.y) * sy)
    }
    g.lineWidth = 2
    for (const s of segments) {
      // 選んだ線は色を変える（G159）
      g.strokeStyle = strokeColorOf('#1f2a44', selectedIds.includes(s.id))
      // 曲線（spline）は制御点、円弧（arc）は弦誤差で折った点列を通す。直線は両端を結ぶ（t82）
      const pts = polylineOfSegment(s)
      g.beginPath()
      pts.forEach((p, i) => {
        const x = p.x / P3_MM_PER_PX + OX
        const y = OY - p.y / P3_MM_PER_PX
        if (i === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      })
      g.stroke()
    }
    if (trail && trail.length > 1) {
      g.strokeStyle = '#999'
      g.beginPath()
      g.moveTo(trail[0]!.x, trail[0]!.y)
      for (const p of trail.slice(1)) g.lineTo(p.x, p.y)
      g.stroke()
    }
  }, [segments, trail, selectedIds, viewBox])

  const local = (e: { clientX: number; clientY: number }) => {
    const r = ref.current!.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    return viewBox
      ? { x: (viewBox.x + x * viewBox.width) / P3_MM_PER_PX + OX, y: (viewBox.y + y * viewBox.height) / P3_MM_PER_PX + OY }
      : { x: x * P3_W, y: y * P3_H }
  }

  // 道具の途中の形（mm）を、画面の軌跡（px）にする
  const toTrail = (mm: { x: number; y: number }[] | null) => (mm ? mm.map((m) => p3MmToPx(m)) : null)

  // 線を一本、線分（または曲線）にして店舗に足す（P3 の印つき。Undo と作業ログは店舗の経路）
  const addStroke = (stroke: Stroke) => useDrawing.getState().addStroke(stroke, null, 'P3')

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(e)
    // チャットのモード（G159）: 線は描かず、動かさずに離したらタップで選ぶ（onUp）
    if (useMode.getState().mode === 'chat') {
      chatTapRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, moved: false }
      return
    }
    if (arcOn()) {
      // 二点の円弧（t81）: 押した点（端点へ吸着した位置）で一点目・二点目・中心を決める
      const step = arcToolStep(arcRef.current, { type: 'click', point: p3PxToMm(strokeStartPx(nodes, p, P3_VIEWPORT)) })
      arcRef.current = step.state
      if (step.commit) addStroke(p3ArcStroke(step.commit, crypto.randomUUID()))
      setTrail(toTrail(arcPreviewMm(arcRef.current, p3PxToMm(p))))
      return
    }
    setTrail([p])
  }

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(e)
    // チャットのモードのタップ: 動いた距離が閾値を超えたら、タップではない（描かない）
    if (chatTapRef.current && chatTapRef.current.pointerId === e.pointerId) {
      if (isTapMove(e.clientX - chatTapRef.current.x, e.clientY - chatTapRef.current.y, CHAT_TAP_PX)) chatTapRef.current.moved = true
      return
    }
    if (arcOn()) {
      // 二点の円弧（t81）: 動かした位置で、中心線上の中心を決める（確定は押したとき）
      arcRef.current = arcToolStep(arcRef.current, { type: 'move', point: p3PxToMm(p) }).state
      setTrail(toTrail(arcPreviewMm(arcRef.current, p3PxToMm(p))))
      return
    }
    if (!trail) return
    setTrail((t) => (t ? [...t, p] : t))
  }

  // 軌跡を線にして店舗に入れる。既存の端点に吸着させて線にする（D-02 C1: 端点の共有、水平・垂直の吸着）。
  // 直線モードは直線に整形し、曲線モードは曲線のまま残す（pen_mode）
  const finishTrail = () => {
    // 二点の円弧は押したときに決まる。離しても何もしない（軌跡は無い）
    if (arcOn()) return
    const stroke = p3StrokeOfTrail(trail, useUi.getState().penMode, crypto.randomUUID())
    if (stroke) addStroke(stroke)
    setTrail(null)
  }
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const t = chatTapRef.current
    if (t && t.pointerId === e.pointerId) {
      chatTapRef.current = null
      // 動かさずに離したら、いちばん近い線を選ぶ（もう一度で外れる）
      if (!t.moved) {
        const hit = segmentPickAt(segments, p3PxToMm(local(e)), SELECT_PX * P3_MM_PER_PX)
        if (hit !== null) useSelection.getState().toggleSegment(hit)
      }
      return
    }
    finishTrail()
  }
  // キャンバスの外へ出たら、そこまでの軌跡を線にする（離した位置がキャンバスの外でも線を消さない。統括の依頼 2026-11-05）
  const onLeave = () => {
    // チャットのモードのタップは、外へ出たら取りやめる（選ばない）
    if (chatTapRef.current) {
      chatTapRef.current = null
      return
    }
    if (arcOn()) {
      setTrail(null)
      return
    }
    finishTrail()
  }

  const closure = findClosedOutline(segments)
  const label = closure.closed
    ? '閉じている（部屋の閉合）'
    : closure.reason === 'empty'
      ? 'まだ線が無い'
      : closure.reason === 'open'
        ? '閉じていない（端点がつながっていない）'
        : closure.reason === 'branch'
          ? '閉じていない（枝が出ている）'
          : '閉じていない（複数の輪）'

  return (
    <div style={overlay ? { position: 'absolute', inset: 0, pointerEvents: drawing ? 'auto' : 'none' } : { display: 'grid', gap: 6 }}>
      <canvas
        ref={ref}
        width={P3_W}
        height={P3_H}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onLeave}
        style={overlay ? { display: 'block', width: '100%', height: '100%', touchAction: 'none', cursor: drawing ? 'crosshair' : 'default' } : { border: '1px solid #ddd8cc', background: '#fff', touchAction: 'none', width: P3_W, height: P3_H, maxWidth: '100%' }}
        data-testid="p3-canvas"
      />
      {!overlay && <p data-testid="p3-closure">閉合: {label}（線分 {segments.length} 本）</p>}
    </div>
  )
}
