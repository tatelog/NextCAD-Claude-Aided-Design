// 表示の切り替え（モックのメニュー「機能一覧のオンオフ」の表示の項目）。画面の中だけで持つ。
import { create } from 'zustand'

interface UiState {
  /** 地面に落ちる日影（P2 の 3D） */
  showShadow: boolean
  /** 周辺建物（P1 の地図と P2 の 3D） */
  showNeighbors: boolean
  setShowShadow: (on: boolean) => void
  setShowNeighbors: (on: boolean) => void
}

export const useUi = create<UiState>((set) => ({
  showShadow: true,
  showNeighbors: true,
  setShowShadow: (on) => set({ showShadow: on }),
  setShowNeighbors: (on) => set({ showNeighbors: on }),
}))
