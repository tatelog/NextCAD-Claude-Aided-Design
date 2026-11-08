import {tutorialDone} from '../tutorial/state'
import { placementAllowed } from '../volume/placementGuard'
import { previewSetbackLines as setbackLines } from '../volume/setbackLines'
import { deleteSelectedSegments } from '../store/deleteSelection'
import { findClosedOutlines } from '../canvas/closure'
import { alignPlanningEdge } from '../store/planningOrientation'
import { lineClick, lineEnd } from '../input/twoPointLine'
import { snapPoint, snapRadiusMm } from '../input/snap'
import { hitEdgeLabel } from './edgeLabelHit'
import { MiniMap } from './MiniMap'
import { boundsOf } from './mapBounds'
import { scaleBarOf } from './scaleBar'
// 描くキャンバス（共通部品）。指・マウス・ペンを Pointer Events で一つに扱い、入力の種類で挙動を変えない（G23）。
// 振り分けは input/gesture.ts（本数と中ボタン・Shift だけ見る）。1 本 = 描く。2 本 = パンとズーム。
// ホイール = カーソル位置でズーム。中ボタン／Shift + ドラッグ = パン。ダブルタップ・右クリック = サークルメニュー（G52）。
// 外形が閉じていれば、角（四角）と辺の中点（丸）につまみを出す。つまみの上で押したら線は描かず、つまんで外形を動かす（G65）。
import { useEffect, useMemo, useRef, useState } from 'react'
import { findClosedOutline } from '../canvas/closure'
import { moveOutlineVertices } from '../canvas/outlineEdit'
import { ENDPOINT_RING_RADIUS_PX, ringCentersPx, strokeStartPx } from '../input/endpointPick'
import { polylineOfSegment } from '../canvas/arcSegment'
import { arcFromTwoPoints } from '../input/arc'
import { addArcResultStroke } from '../input/numericLine'
import { arcToolStep, ARC_TOOL_START, type ArcToolState } from '../input/twoPointArcTool'
import { useFeatures } from '../store/features'
import { layerOfSegment, visibleSegments, type LayerName } from '../plan/layers'
import { segmentStyle, type LineStyle } from '../plan/lineStyle'
import { useLayers } from '../store/layers'
import { useSemantic } from '../store/semantic'
import { changedIds } from '../volume/changedIds'
import { applyPinch, classifyPointerDown, pinchStep, wheelZoomFactor } from '../input/gesture'
import { gridStepFor } from '../input/gridSteps'
import { nextTap, type TapRecord } from '../input/tap'
import { mmToPx, pxToMm, zoomAt, type Point, type Viewport } from '../geom/viewport'
import type { Node, Segment, Stroke } from '../model/schema'
import { p2Entries, segmentOptionsOf, useDrawing } from '../store/drawing'
import { lotOfConfirmed, useConfirmedSite, type ConfirmedSite } from '../store/confirmedSite'
import { neighborOutlinesOf } from '../volume/neighborFrame'
import { neighborsShownOf } from './volumeDisplay'
import { lotEdgeLabelsOf, lotOf, roadEdgeIndexOf, type LotEdgeLabel } from '../plan/lot'
import { viewOfLot, viewOfSite } from '../plan/lotView'
import { useUi } from '../store/ui'
import { dragHandle, footprintHandles, hitTestHandle, type HandleRef } from '../volume/footprintHandles'
import { strokeToSegments } from '../canvas/strokeToSegments'
import { strokeStageOf } from '../plan/strokeStage'
import { useMode } from '../store/mode'
import { usePending } from '../store/pending'
import { recordWorkLog } from '../app/workLogStore'
import { pendingLogEntry } from '../app/pendingJudgments'
import { judgeSegments } from '../worker/judge'
import { appWorkerUrl } from '../worker/workerUrl'
import { HOLD_JUDGE_MS, holdJudgeDecision, rekeyBySegmentOrder } from '../worker/drawingHold'
import { useSelection } from '../store/selection'
import { CHAT_PICK_PX, isTapMove, segmentPickAt, strokeColorOf } from '../canvas/segmentPick'

/** チャットのモードのタップと動いたを分ける距離（px）。これを超えて動いたら、タップではない */
const CHAT_TAP_PX = 6
import type { Kind } from '../plan/semantic'

/** 押さえている間の判定（Drawing モード。t69）。送った線（仮の id）と、Claude の候補を持つ */
interface HoldState {
  pointerId: number
  timer: number
  provisionalIds: string[]
  results: Map<string, { kind: Kind; confidence: number }>
  /** 判定の応答が届いたか */
  judged: boolean
  /** 離したか（離した線の id を持つ） */
  released: boolean
  strokeId: string | null
  applied: boolean
}

/** 離したあと、押さえている間の候補を確定した線に対応づけて店舗に入れる（線の数が違えば入れない） */
function applyHeldSuggestions(hold: HoldState): void {
  if (hold.applied || hold.strokeId === null || hold.results.size === 0) return
  hold.applied = true
  const committed = useDrawing
    .getState()
    .entries.flatMap((en) => en.segments)
    .filter((s) => s.stroke_id === hold.strokeId)
    .map((s) => s.id)
  const map = rekeyBySegmentOrder(hold.provisionalIds, committed)
  if (map === null) return
  // 判定の一回分として入れる（作業ログに残り、直前の一回を戻せる。G14・G97）
  const items: { id: string; kind: Kind; confidence: number }[] = []
  for (const [provisional, id] of map) {
    const r = hold.results.get(provisional)
    if (r) items.push({ id, kind: r.kind, confidence: r.confidence })
  }
  useSemantic.getState().applyJudgementBatch(items, 'P2')
}

interface PointerTrack {
  id: number
  last: Point
}

/** つまみ（G65）を動かしている最中に見せる外形。弾かれる位置（valid: false）では動かす前の形のまま */
interface HandleDragView {
  segments: Segment[]
  footprint: Point[]
  active: HandleRef
  valid: boolean
}

/** つまんでいる最中。from は押したときの外形。離したとき、view.footprint が成り立っていれば store に確定する */
interface HandleDrag {
  pointerId: number
  handle: HandleRef
  moveStart?: Point
  from: Point[]
  view: HandleDragView
}

/** 近づいた端点の輪の色。アクセント色の定義がまだ無いので、道具のアクティブ表示（pen.css）と同じ色。仮置き */
const ENDPOINT_RING_COLOR = '#1f2a44'

/** つまみの描き方。四角は一辺、丸は直径（画面の px）。当たり判定の半径 12 px より小さく描く。色は端点の輪と同じ。仮置き */
const HANDLE_DRAW_SIZE_PX = 10
const HANDLE_COLOR = '#1f2a44'
/** 動かした結果が外形として成り立たない（離すと元に戻る）ときの、つまんでいるつまみの色。「議論用・未確定」の赤と同じ。仮置き */
const HANDLE_INVALID_COLOR = '#c8412a'

const toPenInput = (type: string): Stroke['pen_input'] => (type === 'pen' ? 'pen' : type === 'touch' ? 'touch' : 'mouse')

/**
 * 二点の円弧の道具（t70）の途中の形（画面 px）。一点目だけなら、一点目から今のポインタまでの弦。
 * 中心を決める途中なら、中心線上の今の中心でできる円弧。道具の途中でなければ null（描きかけの線の描画に任せる）
 */
function arcPreviewPx(state: ArcToolState, vp: Viewport, hover: Point | null): Point[] | null {
  if (state.phase === 'first') return null
  if (state.phase === 'second') {
    const a = mmToPx(vp, state.p1)
    return [a, hover ?? a]
  }
  return arcFromTwoPoints(state.p1, state.p2, state.offsetMm).points.map((q) => mmToPx(vp, q))
}

/** つまみで動かした先の吸着。入力スナップがオンなら見ている拡大率の段の入力側（gridSteps）、オフなら整数 mm（座標は整数 mm のまま） */
const handleSnapMm = (vp: Viewport): number => (useUi.getState().inputSnapGrid ? gridStepFor(vp.mmPerPx).snapMm : 1)

// 初期表示を合わせた敷地（未合わせは undefined）。画面を離れて戻っても、同じ筆なら動かさない
let fittedLot: readonly Point[] | undefined

/** 辺の番号の位置（外向きに、画面の px）と丸の半径・文字（画面の px で一定） */
const EDGE_LABEL_OFFSET_PX = 16
const EDGE_LABEL_RADIUS_PX = 9
const EDGE_LABEL_FONT = '11px sans-serif'

export function DrawingCanvas({ onDimensionRequest, panOnly = false, selectOnly = false, siteOverride, overviewShadows = [], showRoadNumbers = true }: { onDimensionRequest?:()=>void; panOnly?: boolean; selectOnly?: boolean; showRoadNumbers?: boolean; siteOverride?: ConfirmedSite | null; overviewShadows?: {x: number; y: number}[][] } = {}) {
  const dimensionRequestRef=useRef(onDimensionRequest)
  dimensionRequestRef.current=onDimensionRequest
  const dimensionHandleRef=useRef<HandleRef|null>(null)
  const selectOnlyRef = useRef(selectOnly)
  selectOnlyRef.current = selectOnly
  const panOnlyRef = useRef(panOnly)
  panOnlyRef.current = panOnly
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(([entry]) => { if (entry) setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height }) })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])
  const showMiniMap = useUi(s => s.showMiniMap)
  const viewport = useDrawing((s) => s.viewport)
  const setViewport = useDrawing((s) => s.setViewport)
  const fitViewport = useDrawing((s) => s.fitViewport)
  const addStroke = useDrawing((s) => s.addStroke)
  const transform = useDrawing((s) => s.transform)
  // 描く画面（P2）の線は P2 の線だけ。P3 の線はこの画面に出さない
  const drawnAll = useDrawing((s) => s.entries)
  const entries = useMemo(() => p2Entries(drawnAll), [drawnAll])
  // 敷地（筆界）: 確定した敷地の筆、無ければダミー。点線で出す（統括の依頼 2026-11-06。1）
  const selectedRoadEdge = useConfirmedSite((s) => s.roadEdge)
  const storedSite = useConfirmedSite((s) => s.confirmed)
  const confirmedSite = siteOverride === undefined ? storedSite : siteOverride
  const lot = lotOf(lotOfConfirmed(confirmedSite))
  // 筆界の辺の番号（統括の決定 2026-11-06）。いま選んでいる前面道路の辺を印にする
  const edgeLabels = useMemo(() => showRoadNumbers ? lotEdgeLabelsOf(lot, roadEdgeIndexOf(lot, confirmedSite?.roadEdge ?? selectedRoadEdge)) : [], [lot, confirmedSite?.roadEdge, selectedRoadEdge, showRoadNumbers])
  const siteFill = confirmedSite?.lot != null
  // 周辺建物の輪郭（確定した筆の枠で置いた。筆とずれない。統括の依頼 2026-11-06。5）
  const confirmedFrame = confirmedSite?.frame ?? null
  const confirmedBuildings = useConfirmedSite((s) => s.buildings.data)
  // 周辺建物の輪郭は、ボリュームの周辺建物の切り替えに従う（代表の依頼 2026-11-06。1）。切ると輪郭を描かない
  const neighborsOn = useUi((s) => neighborsShownOf(s.showNeighbors, s.volumeNeighbors))
  const neighborOutlines = useMemo(
    () => (neighborsOn ? neighborOutlinesOf(confirmedBuildings ?? [], confirmedFrame) : []),
    [neighborsOn, confirmedBuildings, confirmedFrame],
  )
  const displayGrid = useUi((s) => s.displayGrid)
  const openCircleMenu = useUi((s) => s.openCircleMenu)
  const segments = useMemo(() => entries.flatMap((e) => e.segments), [entries])
  // 非表示のレイヤーの線は描かない（当たり判定と寸法は変えない）。表示は店舗、線の種類は意味づけの店舗
  const layerVisible = useLayers((s) => s.visible)
  const assignments = useSemantic((s) => s.assignments)
  const shownSegments = useMemo(() => visibleSegments(segments, assignments, layerVisible), [segments, assignments, layerVisible])
  // 線ごとの層（見え方を決める）。意味づけが変われば、層も見え方も変わる
  const layerById = useMemo(
    () =>
      new Map(
        shownSegments.map((s) => {
          const a = assignments[s.id]
          return [s.id, { layer: layerOfSegment(s.stage, a?.kind ?? null), needsReview: a?.status === 'needs_review' }] as const
        }),
      ),
    [shownSegments, assignments],
  )
  const nodes = useMemo(() => entries.flatMap((e) => e.nodes), [entries])
  const footprint = useMemo(() => {
    const c = findClosedOutline(segments)
    return c.closed ? c.footprint : null
  }, [segments])

  const lineStartRef = useRef<Point | null>(null)
  const linePreviewRef = useRef<Point[] | null>(null)
  const penMode = useUi(s => s.penMode)
  const mode = useMode(s => s.mode)
  useEffect(() => {
    lineStartRef.current = null
    linePreviewRef.current = null
  }, [penMode, mode, panOnly, selectOnly])
  const drawingRef = useRef<{ pointerId: number; pointerType: string; points: Point[] } | null>(null)
  // 押さえている間の判定（Drawing モード。t69）
  const holdRef = useRef<HoldState | null>(null)
  /** つまみ（外形の角・辺の中点）をつまんでいる最中。つまんでいる間は線を描かない（G65） */
  const handleDragRef = useRef<HandleDrag | null>(null)
  const pointersRef = useRef<Map<number, PointerTrack>>(new Map())
  const panRef = useRef<{ last: Point } | null>(null)
  // チャットのモードのタップの途中（G159）。動かさずに離したら選ぶ
  const chatTapRef = useRef<{ pointerId: number; x: number; y: number; moved: boolean } | null>(null)
  const lastTapRef = useRef<TapRecord | null>(null)
  /** ポインタの今の位置（画面 px）。押していなくても持つ。無ければ null（端点の輪を出さない） */
  const hoverRef = useRef<Point | null>(null)
  /** 二点の円弧の道具（t70）の状態。曲線モードで二点の円弧を選んでいるときだけ動く */
  const arcRef = useRef<ArcToolState>(ARC_TOOL_START)
  const viewportRef = useRef(viewport)
  viewportRef.current = viewport

  // 二点の円弧の道具を外したら、途中の一点目・二点目は捨てる（t70）
  const arcTwoPoint = useUi((s) => s.arcTwoPoint)
  useEffect(() => {
    arcRef.current = ARC_TOOL_START
  }, [arcTwoPoint])

  // 初期表示: 選んだ筆（無ければダミー 20 m × 30 m）が収まるように原点と倍率を置く。最初の一回は従来どおり（合わせ済みなら動かさない）
  // 筆が変わったら、その筆に合わせ直す（統括の依頼 2026-11-06。1 件目）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (!(rect.width > 0 && rect.height > 0)) return
    // 確定した筆は、筆が画面の半分くらいに、すぐ隣の周辺建物が見えるように合わせる（統括の依頼 2026-11-06。3）
    const view = siteFill ? viewOfSite(lot, rect.width, rect.height) : viewOfLot(lot, rect.width, rect.height)
    if (fittedLot === undefined) fitViewport(view)
    else if (fittedLot !== lot) setViewport(view)
    fittedLot = lot
  }, [lot, siteFill, fitViewport, setViewport])

  // 状態が変わるたびに描き直す
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    paint(
      canvas,
      viewport,
      shownSegments,
      nodes,
      footprint,
      linePreviewRef.current?.map(p => mmToPx(viewportRef.current, p)) ?? drawingRef.current?.points ?? arcPreviewPx(arcRef.current, viewportRef.current, hoverRef.current),
      displayGrid,
      useFeatures.getState().on.endpointRing ? hoverRef.current : null,
      handleDragRef.current?.view ?? null,
      layerById,
      lot,
      neighborOutlines,
      edgeLabels,
    )
  }, [viewport, shownSegments, layerById, nodes, footprint, displayGrid, lot, neighborOutlines, edgeLabels, penMode, mode, panOnly, selectOnly])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const local = (e: PointerEvent | MouseEvent): Point => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    const repaint = () =>
      paint(
        canvas,
        viewportRef.current,
        shownSegments,
        nodes,
        footprint,
        linePreviewRef.current?.map(p => mmToPx(viewportRef.current, p)) ?? drawingRef.current?.points ?? arcPreviewPx(arcRef.current, viewportRef.current, hoverRef.current),
        displayGrid,
        useFeatures.getState().on.endpointRing ? hoverRef.current : null,
        handleDragRef.current?.view ?? null,
        layerById,
        lot,
        neighborOutlines,
        edgeLabels,
      )

    // 押さえ続けた線を、判定に送る（Drawing モード。G108・G112）。送るのは描いている線だけで、チャットの文は送らない
    const runHoldJudge = (pointerId: number) => {
      const hold = holdRef.current
      const d = drawingRef.current
      if (!hold || hold.pointerId !== pointerId || !d || d.pointerId !== pointerId) return
      const vp = viewportRef.current
      const ui = useUi.getState()
      const stroke: Stroke = {
        id: crypto.randomUUID(),
        points: d.points.map((q) => ({ px: q.x, py: q.y })),
        view_scale: vp.mmPerPx,
        view_origin: { px: vp.originPx.x, py: vp.originPx.y },
        stage: strokeStageOf(useMode.getState().mode),
        pen_mode: ui.penMode,
        created_at: new Date().toISOString(),
        pen_input: toPenInput(d.pointerType),
      }
      const gridMm = ui.inputSnapGrid ? gridStepFor(vp.mmPerPx).snapMm : null
      const entries = p2Entries(useDrawing.getState().entries)
      // 確定（addStroke）と同じ分け方で仮の線分を作る。送った線の id を、離したあとの線に対応づける
      const provisional = strokeToSegments(
        stroke,
        entries.flatMap((en) => en.nodes),
        segmentOptionsOf(stroke, gridMm),
        entries.flatMap((en) => en.segments),
      ).segments
      const decision = holdJudgeDecision({
        heldMs: HOLD_JUDGE_MS,
        segmentCount: provisional.length,
        enabled: useFeatures.getState().on.classifyClaude,
        workerUrl: appWorkerUrl(),
      })
      if (decision.kind !== 'send') return
      hold.provisionalIds = provisional.map((s) => s.id)
      void judgeSegments(
        {
          segments: provisional.map((s) => ({ id: s.id, a: { x: s.x1, y: s.y1 }, b: { x: s.x2, y: s.y2 } })),
          workerUrl: appWorkerUrl(),
          enabled: true,
          fetchImpl: (url, init) => fetch(url, init),
        },
        {
          suggest: (id, kind, confidence) => {
            hold.results.set(id, { kind, confidence })
          },
          addPending: (error) => {
            const at = new Date().toISOString()
            usePending.getState().add({ id: `judge-${Date.now()}`, label: '意味づけの判定', error, at })
            recordWorkLog(pendingLogEntry(error, at))
          },
        },
      ).then(() => {
        hold.judged = true
        if (hold.released) applyHeldSuggestions(hold)
      })
    }

    // Drawing モードで線を描き始めたら、押さえ続けた時間を計る（閾値に届いたら判定を送る）
    const startHoldJudge = (pointerId: number) => {
      if (useMode.getState().mode !== 'drawing') return
      if (holdRef.current) window.clearTimeout(holdRef.current.timer)
      const timer = window.setTimeout(() => runHoldJudge(pointerId), HOLD_JUDGE_MS)
      holdRef.current = { pointerId, timer, provisionalIds: [], results: new Map(), judged: false, released: false, strokeId: null, applied: false }
    }

    // 離したら、確定した線の id を押さえている間の判定に結びつける。応答がまだなら、届いたときに入れる
    const releaseHold = (pointerId: number, strokeId: string) => {
      const hold = holdRef.current
      if (!hold || hold.pointerId !== pointerId) return
      window.clearTimeout(hold.timer)
      holdRef.current = null
      hold.released = true
      hold.strokeId = strokeId
      if (hold.judged) applyHeldSuggestions(hold)
    }

    const linePoint = (p: Point, shift: boolean): Point => {
      const vp = viewportRef.current
      const ui = useUi.getState()
      const raw = pxToMm(vp, p)
      const snapped = snapPoint({x:Math.round(raw.x), y:Math.round(raw.y)}, {
        nodes, segments, prev: null, radiusMm: snapRadiusMm(vp.mmPerPx), axisDeg: 0,
        gridMm: ui.inputSnapGrid ? gridStepFor(vp.mmPerPx).snapMm : null,
      })
      const point = {x:snapped.x, y:snapped.y}
      return lineStartRef.current ? lineEnd(lineStartRef.current, point, shift) : point
    }
    const onDown = (e: PointerEvent) => {
      const p = local(e)
      if (selectOnlyRef.current && e.button === 0) {
        const edge = hitEdgeLabel(p, edgeLabels, viewportRef.current)
        if (edge !== null) {
          alignPlanningEdge(edge)
          return
        }
      }
      let intent = classifyPointerDown({
        pointerType: e.pointerType,
        button: e.button,
        shiftKey: e.shiftKey,
        activeCount: pointersRef.current.size + 1,
      })
      if (panOnlyRef.current && intent !== 'none' && intent !== 'pan-zoom') intent = 'pan'
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
        lineStartRef.current = null
        linePreviewRef.current = null
        // 2 本目が来たら描くのも、つまみを動かすのもやめてパン・ズームに切り替える（つまみは確定せずに元の形へ）
        drawingRef.current = null
        handleDragRef.current = null
        panRef.current = null
        hoverRef.current = null
        repaint()
        return
      }
      if (intent === 'pan') {
        panRef.current = { last: p }
        hoverRef.current = null
        repaint()
        return
      }
      // ダブルタップは、描かずにサークルメニューを出す（G52）
      // チャットのモード（G159）: 線は描かず、動かさずに離したらタップで選ぶ（onUp）
      if (useMode.getState().mode === 'chat') {
        chatTapRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, moved: false }
        return
      }
      if (selectOnlyRef.current) {
        const point = pxToMm(viewportRef.current, p)
        const hit = segmentPickAt(shownSegments, point, CHAT_PICK_PX * viewportRef.current.mmPerPx)
        let ids = hit ? [hit] : []
        if (!hit) {
          for (const outline of findClosedOutlines(shownSegments).reverse()) {
            let inside=false
            for(let i=0,j=outline.length-1;i<outline.length;j=i++) {
              const a=outline[i]!,b=outline[j]!
              if((a.y>point.y)!==(b.y>point.y) && point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x) inside=!inside
            }
            if(inside) {
              const keys=new Set(outline.map(q=>`${q.x},${q.y}`))
              ids=shownSegments.filter(s=>keys.has(`${s.x1},${s.y1}`)&&keys.has(`${s.x2},${s.y2}`)).map(s=>s.id)
              break
            }
          }
        }
        useSelection.getState().setSegmentIds(ids)
      }
      // つまみ（外形の角・辺の中点。12 px 以内）の上で押したら、線は描き始めずにそのつまみを動かす。つまみが優先（G65）
      const vp = viewportRef.current
      const handle = footprint ? hitTestHandle(footprintHandles(footprint), pxToMm(vp, p), vp.mmPerPx) : null
      if (footprint && handle) {
        dimensionHandleRef.current={kind:handle.kind,index:handle.index}
        canvas.focus({preventScroll:true})
        const active: HandleRef = { kind: handle.kind, index: handle.index }
        drawingRef.current = null
        hoverRef.current = null
        handleDragRef.current = {
          pointerId: e.pointerId,
          handle: active,
          from: footprint,
          view: { segments, footprint, active, valid: true },
        }
        repaint()
        return
      }
      if (selectOnlyRef.current) {
        const point = pxToMm(viewportRef.current, p)
        let inside = false
        if (footprint) for (let i=0,j=footprint.length-1;i<footprint.length;j=i++) {
          const a=footprint[i]!, b=footprint[j]!
          if ((a.y>point.y)!==(b.y>point.y) && point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x) inside=!inside
        }
        if (inside && footprint) {
          const active: HandleRef = {kind:'corner',index:0}
          handleDragRef.current = {pointerId:e.pointerId,handle:active,moveStart:point,from:footprint,view:{segments,footprint,active,valid:true}}
        }
        repaint()
        return
      }
      if (useUi.getState().penMode === 'line') {
        const step = lineClick(lineStartRef.current, linePoint(p, e.shiftKey), e.shiftKey)
        lineStartRef.current = step.start
        linePreviewRef.current = step.start ? [step.start, step.start] : null
        lastTapRef.current = null
        if (step.commit) {
          addStroke({id:crypto.randomUUID(),points:step.commit.map(q=>({px:q.x,py:-q.y})),
            view_scale:1,view_origin:{px:0,py:0},stage:strokeStageOf(useMode.getState().mode),
            pen_mode:'line',created_at:new Date().toISOString(),pen_input:toPenInput(e.pointerType)}, null, undefined, true)
        }
        repaint()
        return
      }
      const tap = nextTap(lastTapRef.current, { t: e.timeStamp, x: p.x, y: p.y })
      lastTapRef.current = tap.next
      if (tap.double) {
        drawingRef.current = null
        hoverRef.current = null
        repaint()
        if (useFeatures.getState().on.circleMenu) openCircleMenu(p)
        return
      }
      // 二点の円弧（t70）: 曲線モードで二点の円弧の道具が選ばれているときは、押した点（端点へ吸着した位置）で一点目・二点目・中心を決める
      if (useUi.getState().penMode === 'curve' && useUi.getState().arcTwoPoint) {
        const vp = viewportRef.current
        const step = arcToolStep(arcRef.current, { type: 'click', point: pxToMm(vp, strokeStartPx(nodes, p, vp)) })
        arcRef.current = step.state
        if (step.commit) addArcResultStroke(step.commit)
        hoverRef.current = p
        repaint()
        return
      }
      // 既存の端点の近く（24 px 以内）で押したら、その端点から描き始める。近い端点は輪で示す（G37）
      hoverRef.current = p
      drawingRef.current = {
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        points: [strokeStartPx(nodes, p, viewportRef.current)],
      }
      startHoldJudge(e.pointerId)
      repaint()
    }

    const onMove = (e: PointerEvent) => {
      const p = local(e)
      // チャットのモードのタップ: 動いた距離が閾値を超えたら、タップではない（描く操作ではないので、ここでは何もしない）
      if (chatTapRef.current && chatTapRef.current.pointerId === e.pointerId) {
        if (isTapMove(e.clientX - chatTapRef.current.x, e.clientY - chatTapRef.current.y, CHAT_TAP_PX)) chatTapRef.current.moved = true
        return
      }
      if (lineStartRef.current && useUi.getState().penMode === 'line' && !panOnlyRef.current && !selectOnlyRef.current && !panRef.current && pointersRef.current.size < 2) {
        linePreviewRef.current = [lineStartRef.current, linePoint(p, e.shiftKey)]
        hoverRef.current = p
        repaint()
        return
      }
      const track = pointersRef.current.get(e.pointerId)
      if (!track) {
        // 押していないポインタ（マウス・ペンのホバー）。近づいた端点だけ輪で示す（G37）
        if (pointersRef.current.size === 0) {
          hoverRef.current = p
          // 二点の円弧の道具（t70）: 動かした位置で、中心線上の中心を決める（確定は押したとき）
          if (useUi.getState().penMode === 'curve' && useUi.getState().arcTwoPoint) {
            arcRef.current = arcToolStep(arcRef.current, { type: 'move', point: pxToMm(viewportRef.current, p) }).state
          }
          repaint()
        }
        return
      }
      if (pointersRef.current.size >= 2) {
        hoverRef.current = null
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
        hoverRef.current = null
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
      // つまみを動かしている最中: 入力スナップの段に吸着させた先へ外形を動かして見せる。成り立たない形は元の形のまま
      const hd = handleDragRef.current
      if (hd && hd.pointerId === e.pointerId) {
        const vp = viewportRef.current
        const point = pxToMm(vp, p)
        const step = handleSnapMm(vp) || 1
        const dx = hd.moveStart ? Math.round((point.x-hd.moveStart.x)/step)*step : 0
        const dy = hd.moveStart ? Math.round((point.y-hd.moveStart.y)/step)*step : 0
        const r = hd.moveStart ? {valid:true,footprint:hd.from.map(q=>({x:q.x+dx,y:q.y+dy}))} : dragHandle(hd.from, hd.handle, point, handleSnapMm(vp))
        if (!r.valid || !placementAllowed(lot, r.footprint, roadEdgeIndexOf(lot, confirmedSite?.roadEdge ?? selectedRoadEdge))) return
        hd.view = {
          segments: moveOutlineVertices(entries, hd.from, r.footprint).flatMap((en) => en.segments),
          footprint: r.footprint,
          active: hd.handle,
          valid: r.valid,
        }
        repaint()
        return
      }
      const d = drawingRef.current
      if (d && d.pointerId === e.pointerId) {
        d.points.push(p)
        hoverRef.current = p
        repaint()
      }
    }

    const onUp = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId)
      // チャットのモードのタップ（G159）: 動かさずに離したら、いちばん近い線を選ぶ（もう一度で外れる）
      if (chatTapRef.current && chatTapRef.current.pointerId === e.pointerId) {
        const t = chatTapRef.current
        chatTapRef.current = null
        if (!t.moved) {
          const vp = viewportRef.current
          const hit = segmentPickAt(shownSegments, pxToMm(vp, local(e)), CHAT_PICK_PX * vp.mmPerPx)
          if (hit !== null) useSelection.getState().toggleSegment(hit)
        }
        repaint()
        return
      }
      if (panRef.current) {
        panRef.current = null
        return
      }
      // つまみを離した: 成り立つ形で、動いていれば 1 操作（1 変形）として store に確定する。成り立たない形は元のまま
      const hd = handleDragRef.current
      if (hd && hd.pointerId === e.pointerId) {
        handleDragRef.current = null
        const moved = hd.view.valid && hd.view.footprint.some((q, i) => q.x !== hd.from[i]!.x || q.y !== hd.from[i]!.y)
        if (moved) {
          const before = useDrawing.getState().entries.flatMap((en) => en.segments)
          transform((es) => moveOutlineVertices(es, hd.from, hd.view.footprint))
          // つまみで動かした線は、動かしたあとに Claude が判定し直す（G114）。判定の結果がある線だけ、要確認の印を付ける
          const after = useDrawing.getState().entries.flatMap((en) => en.segments)
          useSemantic.getState().markNeedsReview(changedIds(before, after))
        } else repaint()
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
        stage: strokeStageOf(useMode.getState().mode),
        pen_mode: ui.penMode,
        created_at: new Date().toISOString(),
        pen_input: toPenInput(d.pointerType),
      }
      // 入力スナップのグリッドは、見ている拡大率の段の入力側（gridSteps）。表示グリッドのオン・オフとは別に切れる
      addStroke(stroke, ui.inputSnapGrid ? gridStepFor(vp.mmPerPx).snapMm : null)
      releaseHold(e.pointerId, stroke.id)
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      // 描いている途中の拡大・縮小は、描きかけの線を捨てる（点の座標と表示の倍率が食い違うため）
      drawingRef.current = null
      // 倍率が変わると 24 px に入る端点も変わるので、輪の元になる位置を今のカーソル位置にしておく
      hoverRef.current = local(e)
      setViewport(zoomAt(viewportRef.current, wheelZoomFactor(e.deltaY), local(e)))
    }

    // キャンセル（OS がジェスチャを奪った等）は、描きかけの線も、動かしかけのつまみも、確定せずに捨てる
    const onCancel = (e: PointerEvent) => {
      lineStartRef.current = null
      linePreviewRef.current = null
      pointersRef.current.delete(e.pointerId)
      if (drawingRef.current?.pointerId === e.pointerId) drawingRef.current = null
      if (handleDragRef.current?.pointerId === e.pointerId) handleDragRef.current = null
      panRef.current = null
      hoverRef.current = null
      repaint()
    }

    // ポインタがキャンバスから出た（指を離したあとも含む）。端点の輪は消す
    const onLeave = () => {
      if (hoverRef.current === null) return
      hoverRef.current = null
      repaint()
    }

    // 右クリックはサークルメニュー（G52）。ブラウザの既定のメニューは出さない
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      if (useFeatures.getState().on.circleMenu) openCircleMenu(local(e))
    }

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if(e.type==='keydown'&&e.key==='Tab'&&e.shiftKey&&document.activeElement===canvas&&dimensionHandleRef.current&&dimensionRequestRef.current){
        e.preventDefault();handleDragRef.current=null;drawingRef.current=null;repaint();dimensionRequestRef.current();return
      }
      if (e.type === 'keydown' && selectOnlyRef.current && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault(); deleteSelectedSegments(); return
      }

      if (e.key === 'Escape') { lineStartRef.current = null; linePreviewRef.current = null; repaint() }
      if (e.key === 'Shift' && lineStartRef.current && hoverRef.current) {
        linePreviewRef.current = [lineStartRef.current, linePoint(hoverRef.current, e.shiftKey)]
        repaint()
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onCancel)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('contextmenu', onContextMenu)
    // 選ぶ・外すで、線の色を描き直す（G159）
    const unsubSelection = useSelection.subscribe(() => repaint())
    return () => {
      unsubSelection()
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onCancel)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', onContextMenu)
    }
  }, [addStroke, transform, setViewport, openCircleMenu, entries, shownSegments, layerById, nodes, footprint, displayGrid, lot, neighborOutlines, edgeLabels, penMode, mode, panOnly, selectOnly])

  useEffect(()=>{const id=requestAnimationFrame(()=>window.dispatchEvent(new Event('tutorial-target-change')));return()=>cancelAnimationFrame(id)},[viewport,edgeLabels,selectOnly])
  const selectedCount = useSelection(s => s.segmentIds.length)
  const bar = scaleBarOf(viewport.mmPerPx)
  // SVG は下向き Y。作図座標の Y を反転して向きをそろえる。
  const overview = [lot, ...shownSegments.map(segment => polylineOfSegment(segment))].map(poly => poly.map(p => ({ x: p.x, y: -p.y })))
  const shadowOverview = overviewShadows.map(poly => poly.map(p => ({x: p.x, y: -p.y})))
  const overviewBounds = boundsOf([...overview, ...shadowOverview])
  const topLeft = pxToMm(viewport, { x: 0, y: 0 })
  const bottomRight = pxToMm(viewport, { x: canvasSize.width, y: canvasSize.height })
  return <>
    {showRoadNumbers && lot.length >= 3 && <div style={{position:'absolute',left:16,top:12,zIndex:2,pointerEvents:'none',fontSize:12,color:'#536174'}}>境界番号をクリックすると、その辺が水平になります</div>}
    {selectOnly && selectedCount > 0 && <button type="button" onClick={deleteSelectedSegments} style={{position:'absolute',left:12,top:100,zIndex:3}}>選択を削除</button>}
    {selectOnly && edgeLabels.map(label => {
      const m = mmToPx(viewport, label.mid)
      return <button key={label.index} type="button" aria-label={`敷地境界 ${label.index}`} data-tutorial={label.index === 6 ? 'tutorial-road' : undefined}
        style={{position:'absolute',left:m.x+label.outward.x*EDGE_LABEL_OFFSET_PX-12,top:m.y-label.outward.y*EDGE_LABEL_OFFSET_PX-12,width:24,height:24,padding:0,border:0,background:'transparent',borderRadius:'50%',zIndex:3,cursor:'pointer'}}
        onClick={()=>{alignPlanningEdge(label.index);if(label.index===6&&useConfirmedSite.getState().confirmed?.planningEdge===6)tutorialDone('tutorial-road')}} />
    })}
    <canvas ref={canvasRef} tabIndex={0} aria-label="ボリューム作図キャンバス" className="drawing-canvas" style={{ touchAction: 'none' }} />
    <div aria-label="縮尺表示" style={{ position: 'absolute', left: 12, bottom: 12, padding: '6px 8px', background: 'rgba(255,255,255,.92)', borderRadius: 4, pointerEvents: 'none', fontSize: 12, color: '#253247', zIndex: 2, minWidth: 120 }}>
      <div title="96dpi換算。画面上の物理的な縮尺は端末やブラウザー倍率により異なります。" style={{ fontWeight: 600, marginBottom: 6 }}>表示縮尺（目安） 1:{Math.round(viewport.mmPerPx * 96 / 25.4).toLocaleString('ja-JP')}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: bar.widthPx }}><span>0</span><span>{bar.lengthMm >= 1000 ? `${bar.lengthMm / 1000} m` : `${bar.lengthMm} mm`}</span></div>
      <div style={{ width: bar.widthPx, height: 6, border: '1px solid #536174', borderTop: 0, boxSizing: 'border-box' }} />
    </div>
    {showMiniMap && overviewBounds && <MiniMap bounds={overviewBounds} site={overview[0]} shadows={shadowOverview} polygons={overview.slice(1)} frame={{ x0: topLeft.x, y0: -topLeft.y, x1: bottomRight.x, y1: -bottomRight.y }} />}
  </>
}

function paint(
  canvas: HTMLCanvasElement,
  vp: Viewport,
  segments: Segment[],
  nodes: Node[],
  footprint: Point[] | null,
  currentPx: Point[] | null,
  showGrid: boolean,
  hoverPx: Point | null,
  handleView: HandleDragView | null,
  layerById: ReadonlyMap<string, { layer: LayerName; needsReview: boolean }>,
  lot: readonly Point[],
  neighborOutlines: readonly (readonly Point[])[],
  edgeLabels: readonly LotEdgeLabel[],
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  // つまみを動かしている最中は、動かした外形（成り立たない位置では動かす前の形）を見せる
  const shownSegments = handleView ? handleView.segments : segments
  const shownFootprint = handleView ? handleView.footprint : footprint
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

  // 表示グリッド（入力スナップとは別。表示だけで吸着には使わない）。1 目盛りは拡大率で変わる段の表示側（gridSteps）
  if (showGrid) {
    const gridMm = gridStepFor(vp.mmPerPx).displayMm
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

  // 敷地（筆界）を点線で出す（選んだ筆、無ければダミー）
  ctx.strokeStyle = '#8a7f6a'
  ctx.setLineDash([8, 6])
  ctx.lineWidth = 1.5
  ctx.beginPath()
  lot.forEach((p, i) => {
    const q = mmToPx(vp, p)
    if (i === 0) ctx.moveTo(q.x, q.y)
    else ctx.lineTo(q.x, q.y)
  })
  ctx.closePath()
  ctx.stroke()
  ctx.setLineDash([])

  if (shownFootprint) {
    ctx.save()
    ctx.strokeStyle='#64748b';ctx.fillStyle='#34445b';ctx.font='12px sans-serif';ctx.lineWidth=1
    for(const dimension of setbackLines(lot,shownFootprint)??[]) {
      const a=mmToPx(vp,dimension.from),b=mmToPx(vp,dimension.to)
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()
      const x=(a.x+b.x)/2,y=(a.y+b.y)/2
      ctx.strokeStyle='#fafaf7';ctx.lineWidth=3;ctx.strokeText(dimension.label,x+4,y-4)
      ctx.fillText(dimension.label,x+4,y-4);ctx.strokeStyle='#64748b';ctx.lineWidth=1
    }
    ctx.restore()
  }

  // 筆界の辺の番号。丸と文字は画面の px で一定（拡大縮小しても読める）。外向きに置く。前面道路に選んだ辺は色を変える
  for (const l of edgeLabels) {
    const m = mmToPx(vp, l.mid)
    const x = m.x + l.outward.x * EDGE_LABEL_OFFSET_PX
    const y = m.y - l.outward.y * EDGE_LABEL_OFFSET_PX
    ctx.beginPath()
    ctx.arc(x, y, EDGE_LABEL_RADIUS_PX, 0, Math.PI * 2)
    ctx.fillStyle = l.selected ? '#1f2a44' : '#ffffff'
    ctx.fill()
    ctx.strokeStyle = '#8a7f6a'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = l.selected ? '#ffffff' : '#444444'
    ctx.font = EDGE_LABEL_FONT
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(l.index), x, y)
  }

  // 周辺建物の輪郭（確定した筆の枠。細い灰色の線）
  ctx.strokeStyle = '#7d8790'
  ctx.lineWidth = 1
  for (const ring of neighborOutlines) {
    ctx.beginPath()
    ring.forEach((p, i) => {
      const q = mmToPx(vp, p)
      if (i === 0) ctx.moveTo(q.x, q.y)
      else ctx.lineTo(q.x, q.y)
    })
    ctx.closePath()
    ctx.stroke()
  }

  // 閉じた外形の塗り
  if (shownFootprint && shownFootprint.length >= 3) {
    ctx.fillStyle = 'rgba(46, 125, 50, 0.12)'
    ctx.beginPath()
    shownFootprint.forEach((p, i) => {
      const q = mmToPx(vp, p)
      if (i === 0) ctx.moveTo(q.x, q.y)
      else ctx.lineTo(q.x, q.y)
    })
    ctx.closePath()
    ctx.fill()
  }

  // 整形後の線分。層ごとの見え方（色・太さ・破線）で、同じ見え方の線をまとめて描く。曲線は制御点を通る折れ線で描く（見た目だけ。正本は制御点）
  const groups = new Map<string, { style: LineStyle; list: Segment[] }>()
  const selectedIds = new Set(useSelection.getState().segmentIds)
  for (const s of shownSegments) {
    const mark = layerById.get(s.id)
    const base = segmentStyle(mark?.layer ?? 'その他', mark?.needsReview ?? false)
    // 選んだ線は色を変える（G159）
    const style = { ...base, color: strokeColorOf(base.color, selectedIds.has(s.id)) }
    const key = `${style.color}|${style.width}|${style.dash.join(',')}`
    const group = groups.get(key)
    if (group) group.list.push(s)
    else groups.set(key, { style, list: [s] })
  }
  ctx.lineCap = 'round'
  for (const { style, list } of groups.values()) {
    ctx.strokeStyle = style.color
    ctx.lineWidth = style.width
    ctx.setLineDash(style.dash)
    ctx.beginPath()
    for (const s of list) {
      // 曲線（spline）は制御点、円弧（arc）は弦誤差で折った点列を通す。直線は両端を結ぶ（t82）
      polylineOfSegment(s).forEach((p, i) => {
        const q = mmToPx(vp, p)
        if (i === 0) ctx.moveTo(q.x, q.y)
        else ctx.lineTo(q.x, q.y)
      })
    }
    ctx.stroke()
  }
  ctx.setLineDash([])

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

  // 端点は普段は画面に出さない（2026-11-03 代表）。ポインタが 24 px 以内に近づいた端点だけ、輪で示す（G37）。
  // 輪が出た端点が、押したときの描き始めと、描き終わりの吸着の先になる。データとしては持ち、閉合の検査にも使う
  if (hoverPx) {
    ctx.strokeStyle = ENDPOINT_RING_COLOR
    ctx.lineWidth = 2
    for (const c of ringCentersPx(nodes, hoverPx, vp)) {
      ctx.beginPath()
      ctx.arc(c.x, c.y, ENDPOINT_RING_RADIUS_PX, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  // 外形のつまみ（G65）: 角は四角、辺の中点は丸。つまんでいるものは塗り、元に戻る位置では赤にする
  if (shownFootprint && shownFootprint.length >= 3) {
    const half = HANDLE_DRAW_SIZE_PX / 2
    const active = handleView?.active ?? null
    ctx.lineWidth = 2
    for (const handle of footprintHandles(shownFootprint)) {
      const c = mmToPx(vp, handle)
      const picked = active !== null && active.kind === handle.kind && active.index === handle.index
      const color = picked && handleView && !handleView.valid ? HANDLE_INVALID_COLOR : HANDLE_COLOR
      ctx.strokeStyle = color
      ctx.fillStyle = picked ? color : '#ffffff'
      ctx.beginPath()
      if (handle.shape === 'square') ctx.rect(c.x - half, c.y - half, HANDLE_DRAW_SIZE_PX, HANDLE_DRAW_SIZE_PX)
      else ctx.arc(c.x, c.y, half, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }
}
