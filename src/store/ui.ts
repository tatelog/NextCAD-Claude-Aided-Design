// 画面の表示と入力の設定を一つに持つ。
// 描く画面（タブレット側）: 道具の置き場（上・左・独立）、サークルメニュー、直線／曲線、表示グリッドと入力スナップ。
// 表示の切り替え（develop 側）: 日影・周辺建物・寸法線・グリッド（P3 の背景）・全体図（モックのメニュー）。
// 端末ごとに覚えるかどうかは未決（D-04 未決）。ここでは覚えない（メモリだけ）。
import { create } from 'zustand'

export type ToolbarPlacement = 'top' | 'left' | 'free'
export type PenMode = 'line' | 'curve'

export interface Point {
  x: number
  y: number
}

export interface UiState {
  toolbarPlacement: ToolbarPlacement
  /** 独立（free）のときの道具の位置（画面 px） */
  freePosition: Point
  /** サークルメニューを開いている位置（px）。閉じていれば null */
  circleMenu: Point | null
  penMode: PenMode
  /** 表示グリッド（見せるだけ。吸着には使わない） */
  displayGrid: boolean
  /** 入力スナップのグリッド（吸着に使う。表示とは別設定） */
  inputSnapGrid: boolean
  setToolbarPlacement: (p: ToolbarPlacement) => void
  setFreePosition: (p: Point) => void
  openCircleMenu: (p: Point) => void
  closeCircleMenu: () => void
  setPenMode: (m: PenMode) => void
  setDisplayGrid: (on: boolean) => void
  setInputSnapGrid: (on: boolean) => void

  // 表示の切り替え（メニュー）
  /** 地面に落ちる日影（P2 の 3D） */
  showShadow: boolean
  /** 周辺建物（P1 の地図と P2 の 3D） */
  showNeighbors: boolean
  /** 寸法線（P3 の平面） */
  showDimensions: boolean
  /** グリッド（P3 の平面の背景） */
  showGrid: boolean
  /** 全体図（右下の縮図） */
  showMiniMap: boolean
  setShowMiniMap: (on: boolean) => void
  setShowShadow: (on: boolean) => void
  setShowNeighbors: (on: boolean) => void
  setShowDimensions: (on: boolean) => void
  setShowGrid: (on: boolean) => void
}

export const useUi = create<UiState>((set) => ({
  toolbarPlacement: 'top',
  freePosition: { x: 16, y: 64 },
  circleMenu: null,
  penMode: 'line',
  displayGrid: true,
  inputSnapGrid: true,
  setToolbarPlacement: (toolbarPlacement) => set({ toolbarPlacement }),
  setFreePosition: (freePosition) => set({ freePosition }),
  openCircleMenu: (p) => set({ circleMenu: { x: p.x, y: p.y } }),
  closeCircleMenu: () => set({ circleMenu: null }),
  setPenMode: (penMode) => set({ penMode }),
  setDisplayGrid: (displayGrid) => set({ displayGrid }),
  setInputSnapGrid: (inputSnapGrid) => set({ inputSnapGrid }),

  showShadow: true,
  showNeighbors: true,
  showDimensions: true,
  showGrid: true,
  showMiniMap: true,
  setShowMiniMap: (on) => set({ showMiniMap: on }),
  setShowShadow: (on) => set({ showShadow: on }),
  setShowNeighbors: (on) => set({ showNeighbors: on }),
  setShowDimensions: (on) => set({ showDimensions: on }),
  setShowGrid: (on) => set({ showGrid: on }),
}))
