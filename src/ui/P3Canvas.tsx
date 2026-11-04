// P3 の描く画面（D-04 P3、D-02 C1）。ドラッグで直線を描き、線分にして（strokeToSegments）、閉合を表示する（findClosedOutline）。
// 描画の入力は setPointerCapture を使わない（合成イベントでも確かめられるように）。描画の共通部品（DrawingCanvas）には触れない。
import { useEffect, useRef, useState } from 'react'
import { findClosedOutline } from '../canvas/closure'
import { strokeToSegments } from '../canvas/strokeToSegments'
import type { Node, Segment } from '../model/schema'
import { p3Stroke } from '../plan/p3Stroke'

const W = 600
const H = 400
const MM_PER_PX = 10
// 表示の原点（mm）。画面の中央あたりに置く
const OX = W / 2
const OY = H / 2

const toMm = (px: number, py: number) => ({ x: Math.round((px - OX) * MM_PER_PX), y: Math.round((OY - py) * MM_PER_PX) })

export function P3Canvas() {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [trail, setTrail] = useState<{ x: number; y: number }[] | null>(null)

  // 描いた線分と、描いている途中の軌跡を描く
  useEffect(() => {
    const c = ref.current
    const g = c?.getContext('2d')
    if (!c || !g) return
    g.clearRect(0, 0, W, H)
    g.strokeStyle = '#1f2a44'
    g.lineWidth = 2
    for (const s of segments) {
      g.beginPath()
      g.moveTo(s.x1 / MM_PER_PX + OX, OY - s.y1 / MM_PER_PX)
      g.lineTo(s.x2 / MM_PER_PX + OX, OY - s.y2 / MM_PER_PX)
      g.stroke()
    }
    if (trail && trail.length > 1) {
      g.strokeStyle = '#999'
      g.beginPath()
      g.moveTo(trail[0]!.x, trail[0]!.y)
      for (const p of trail.slice(1)) g.lineTo(p.x, p.y)
      g.stroke()
    }
  }, [segments, trail])

  const local = (e: { clientX: number; clientY: number }) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(e)
    setTrail([p])
  }
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!trail) return
    const p = local(e)
    setTrail((t) => (t ? [...t, p] : t))
  }
  const onUp = () => {
    if (!trail || trail.length < 2) {
      setTrail(null)
      return
    }
    // 軌跡を mm に直し、既存の端点に吸着させて線分にする（D-02 C1: 端点の共有、水平・垂直の吸着）
    const mmPoints = trail.map((p) => toMm(p.x, p.y))
    const stroke = p3Stroke({
      points: mmPoints.map((m) => ({ px: m.x / MM_PER_PX + OX, py: OY - m.y / MM_PER_PX })),
      viewScaleMmPerPx: MM_PER_PX,
      viewOriginPx: { px: OX, py: OY },
      id: crypto.randomUUID(),
    })
    const r = strokeToSegments(stroke, nodes, { rdpTolerancePx: 8, snapRadiusMm: 240, axisSnapDeg: 3 })
    setNodes((n) => [...n, ...r.nodes])
    setSegments((s) => [...s, ...r.segments])
    setTrail(null)
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
    <div style={{ display: 'grid', gap: 6 }}>
      <canvas
        ref={ref}
        width={W}
        height={H}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => setTrail(null)}
        style={{ border: '1px solid #ddd8cc', background: '#fff', touchAction: 'none', width: W, height: H, maxWidth: '100%' }}
        data-testid="p3-canvas"
      />
      <p data-testid="p3-closure">閉合: {label}（線分 {segments.length} 本）</p>
    </div>
  )
}
