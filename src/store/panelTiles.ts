// 右パネルのタイルの閉じる・戻す（ハブ A-03 G73・G74）。画面の中だけで持つ（保存はしない）。
// 閉じたタイルは hidden に入る。既定は何も閉じていない。
import { create } from 'zustand'

export interface PanelTilesState {
  /** 閉じているタイルの ID。値は常に true（閉じた状態は一つ） */
  hidden: Record<string, true>
  hideTile: (id: string) => void
  showTile: (id: string) => void
  reset: () => void
}

export const usePanelTiles = create<PanelTilesState>((set) => ({
  hidden: {},
  hideTile: (id) => set((s) => ({ hidden: { ...s.hidden, [id]: true } })),
  showTile: (id) =>
    set((s) => {
      const next = { ...s.hidden }
      delete next[id]
      return { hidden: next }
    }),
  reset: () => set({ hidden: {} }),
}))
