// 作図の状態（P03 の一枚目）。正本は Stroke / Node / Segment の3つ。ビューポートは描画だけに効く。
// Undo / Redo は 1 操作（1 ストローク・1 変形）を 1 単位にする。パン・ズームは履歴に入らない。
import { create } from 'zustand'
import { strokeToSegments } from '../canvas/strokeToSegments'
import { createViewport, type Viewport } from '../geom/viewport'
import { SNAP_RADIUS_PX, snapRadiusMm } from '../input/snap'
import type { Node, Segment, Stroke } from '../model/schema'
import { movedSegmentIds } from '../plan/semanticConfirm'
import { movesLockedLayer } from '../plan/layers'
import { useSemantic } from './semantic'
import { useLayers } from './layers'

/** 1 ストロークを 1 単位にした記録。P3 で描いた線だけ screen を持つ（無い線は P2 の線） */
export interface StrokeEntry {
  stroke: Stroke
  segments: Segment[]
  nodes: Node[]
  screen?: 'P3'
}

/** P3 の線（描く画面 P3 で入った線） */
export const p3Entries = (entries: readonly StrokeEntry[]): StrokeEntry[] => entries.filter((e) => e.screen === 'P3')
/** P2 の線（P3 の線を除く。外形・閉合・判定はこちらを見る） */
export const p2Entries = (entries: readonly StrokeEntry[]): StrokeEntry[] => entries.filter((e) => e.screen !== 'P3')

/** 1 単位の前の状態。Undo はこれに戻す */
type Snapshot = StrokeEntry[]

/** Undo の上限（D-02 C1 仮置き: 最大 100 件） */
const UNDO_LIMIT = 100

export interface DrawingState {
  viewport: Viewport
  entries: StrokeEntry[]
  /** Undo で戻す先（古い順。末尾が直前） */
  past: Snapshot[]
  /** Redo で進む先（末尾が直前に Undo したもの） */
  redoStack: Snapshot[]
  storeyCount: number
  storeyHeightMm: number
  setViewport: (vp: Viewport) => void
  /** 初期配置。最初の一回だけ効く（描く画面を開き直しても、今の表示を保つ） */
  fitted: boolean
  fitViewport: (vp: Viewport) => void
  /** 1 本のストロークを 1 単位として追加。gridMm は入力スナップのグリッド（null で無効）。screen 'P3' は P3 の線（端点は P3 の線の中だけに吸着する） */
  addStroke: (stroke: Stroke, gridMm?: number | null, screen?: 'P3') => void
  /**
   * 線分をまとめて変える操作（変形）。1 回の呼び出しが 1 単位。
   * 動いた線（座標または revision が変わった線）のうち種類を持つものは、意味づけの店舗で「要確認」にする（G65 の既定。仮置き）
   */
  transform: (fn: (entries: StrokeEntry[]) => StrokeEntry[]) => void
  undo: () => void
  redo: () => void
  clear: () => void
  setStoreyCount: (n: number) => void
  setStoreyHeightMm: (mm: number) => void
}

export const DRAW_OPTIONS = { rdpTolerancePx: 8, axisSnapDeg: 3, snapRadiusPx: SNAP_RADIUS_PX }

/** 線を線分にするときのオプション。確定（addStroke）と、押さえている間の判定の仮の分け方で同じものを使う（t69） */
export function segmentOptionsOf(stroke: Stroke, gridMm: number | null) {
  return {
    rdpTolerancePx: DRAW_OPTIONS.rdpTolerancePx,
    axisSnapDeg: DRAW_OPTIONS.axisSnapDeg,
    snapRadiusMm: snapRadiusMm(stroke.view_scale),
    gridMm,
  }
}

export const useDrawing = create<DrawingState>((set, get) => {
  // 1 単位の操作: 操作の前の entries を past に積み、新しい entries にする。Redo は消える
  const commit = (next: StrokeEntry[]) =>
    set((s) => ({ past: [...s.past, s.entries].slice(-UNDO_LIMIT), entries: next, redoStack: [] }))

  return {
    viewport: createViewport({ originPx: { x: 0, y: 0 }, mmPerPx: 50 }),
    entries: [],
    past: [],
    redoStack: [],
    storeyCount: 5,
    storeyHeightMm: 3_000,
    setViewport: (viewport) => set({ viewport }),
    fitted: false,
    fitViewport: (viewport) => {
      if (get().fitted) return
      set({ viewport, fitted: true })
    },
    addStroke: (stroke, gridMm = null, screen) => {
      const entries = get().entries
      // 吸着と交点は、同じ画面の線の中だけで見る（P3 の線は P2 の端点に吸わない。P2 の線は今までどおり）
      const scope = screen === 'P3' ? p3Entries(entries) : p2Entries(entries)
      const { segments, nodes } = strokeToSegments(
        stroke,
        scope.flatMap((e) => e.nodes),
        segmentOptionsOf(stroke, gridMm),
        scope.flatMap((e) => e.segments),
      )
      if (segments.length === 0) return
      const entry: StrokeEntry = {
        stroke: { ...stroke, segment_ids: segments.map((s) => s.id) },
        segments,
        nodes,
        ...(screen === 'P3' ? { screen } : {}),
      }
      commit([...entries, entry])
    },
    transform: (fn) => {
      const before = get().entries
      const after = fn(before)
      // 動いた線の種類は消さず、種類を持つ線だけに「要確認」の印を付ける（再判定は Worker の配備後）。増えた線・消えた線は動いた線に入らない
      const movedIds = movedSegmentIds(
        before.flatMap((e) => e.segments),
        after.flatMap((e) => e.segments),
      )
      // ロックしたレイヤーの線が動くなら、変形は全体を取り消す（何も変えない。履歴も増やさない）
      const stageOf = new Map(before.flatMap((e) => e.segments).map((s) => [s.id, s.stage] as const))
      const assignments = useSemantic.getState().assignments
      const moved = movedIds.map((id) => ({ stage: stageOf.get(id) ?? 'F4', kind: assignments[id]?.kind ?? null }))
      if (movesLockedLayer(moved, useLayers.getState().locked)) return
      commit(after)
      if (movedIds.length > 0) useSemantic.getState().markNeedsReview(movedIds)
    },
    undo: () =>
      set((s) => {
        const prev = s.past[s.past.length - 1]
        if (!prev) return s
        return { entries: prev, past: s.past.slice(0, -1), redoStack: [...s.redoStack, s.entries] }
      }),
    redo: () =>
      set((s) => {
        const next = s.redoStack[s.redoStack.length - 1]
        if (!next) return s
        return { entries: next, past: [...s.past, s.entries], redoStack: s.redoStack.slice(0, -1) }
      }),
    // 全部消すも 1 単位。Undo で戻せる
    clear: () => commit([]),
    setStoreyCount: (storeyCount) => set({ storeyCount }),
    setStoreyHeightMm: (storeyHeightMm) => set({ storeyHeightMm }),
  }
})

