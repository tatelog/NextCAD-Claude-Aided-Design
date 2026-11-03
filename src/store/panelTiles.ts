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

/** P3 の右パネルのタイル（閉じる・戻す・メニューの「右パネルの項目」で使う。ハブ A-03 G73・G74） */
export const PANEL_TILES: readonly { id: string; title: string }[] = [
  { id: 'fixtures', title: '什器' },
  { id: 'milestone', title: '節目の要約' },
  { id: 'semantic', title: '意味づけの確認（G14）' },
  { id: 'auto', title: '自動で作る（柱割り・間取り・縦シャフト）' },
  // P2（ボリューム）の右パネルの節。閉じた節は display: none で残す（入力の値は画面の状態に残る）
  { id: 'p2-outline', title: '外形' },
  { id: 'p2-storey', title: '階数・階高' },
  { id: 'p2-volume', title: 'ボリューム' },
  { id: 'p2-numeric', title: '数値で線を入れる' },
  { id: 'p2-rotate', title: '回転' },
]

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
