// 作図の状態（P03 の一枚目）。正本は Stroke / Node / Segment の3つ。ビューポートは描画だけに効く。
import { create } from 'zustand'
import { strokeToSegments } from '../canvas/strokeToSegments'
import { createViewport, type Viewport } from '../geom/viewport'
import type { Node, Segment, Stroke } from '../model/schema'

/** 1 ストロークを 1 単位にした Undo の記録（D-02 C1 仮置き: 最大 100 件） */
interface StrokeEntry {
  stroke: Stroke
  segments: Segment[]
  nodes: Node[]
}

const UNDO_LIMIT = 100

/** ダミーの筆界（実案件の値ではない）。P01/P02 ができるまでの仮置き: 20 m × 30 m */
export const DUMMY_SITE_MM: { x: number; y: number }[] = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 30_000 },
  { x: 0, y: 30_000 },
]

export interface DrawingState {
  viewport: Viewport
  entries: StrokeEntry[]
  redoStack: StrokeEntry[]
  storeyCount: number
  storeyHeightMm: number
  setViewport: (vp: Viewport) => void
  addStroke: (stroke: Stroke) => void
  undo: () => void
  redo: () => void
  clear: () => void
  setStoreyCount: (n: number) => void
  setStoreyHeightMm: (mm: number) => void
}

export const DRAW_OPTIONS = { rdpTolerancePx: 8, axisSnapDeg: 3, snapRadiusPx: 12 }

export const useDrawing = create<DrawingState>((set, get) => ({
  viewport: createViewport({ originPx: { x: 0, y: 0 }, mmPerPx: 50 }),
  entries: [],
  redoStack: [],
  storeyCount: 5,
  storeyHeightMm: 3_000,
  setViewport: (viewport) => set({ viewport }),
  addStroke: (stroke) => {
    const existing = get().entries.flatMap((e) => e.nodes)
    const { segments, nodes } = strokeToSegments(stroke, existing, {
      rdpTolerancePx: DRAW_OPTIONS.rdpTolerancePx,
      axisSnapDeg: DRAW_OPTIONS.axisSnapDeg,
      snapRadiusMm: DRAW_OPTIONS.snapRadiusPx * stroke.view_scale,
    })
    if (segments.length === 0) return
    const entry: StrokeEntry = {
      stroke: { ...stroke, segment_ids: segments.map((s) => s.id) },
      segments,
      nodes,
    }
    set((s) => ({ entries: [...s.entries, entry].slice(-UNDO_LIMIT), redoStack: [] }))
  },
  undo: () =>
    set((s) => {
      const last = s.entries[s.entries.length - 1]
      if (!last) return s
      return { entries: s.entries.slice(0, -1), redoStack: [...s.redoStack, last] }
    }),
  redo: () =>
    set((s) => {
      const last = s.redoStack[s.redoStack.length - 1]
      if (!last) return s
      return { entries: [...s.entries, last], redoStack: s.redoStack.slice(0, -1) }
    }),
  clear: () => set({ entries: [], redoStack: [] }),
  setStoreyCount: (storeyCount) => set({ storeyCount }),
  setStoreyHeightMm: (storeyHeightMm) => set({ storeyHeightMm }),
}))

