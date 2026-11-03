// 表示の切り替え（モックのメニュー「機能一覧のオンオフ」の表示の項目）。画面の中だけで持つ。
import { create } from 'zustand'

interface UiState {
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
