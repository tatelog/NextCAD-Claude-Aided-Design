// 描く画面の表示と入力の設定（D-04 共通部品「ペンのモード」、D-02 C1「グリッドとスナップ」）。
// 道具の置き場（上・左・独立）、サークルメニュー、直線／曲線、表示グリッドと入力スナップは別々に持つ。
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
}))
