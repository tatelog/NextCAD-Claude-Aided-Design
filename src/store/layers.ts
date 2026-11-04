// レイヤーの表示とロックの状態（ハブ D-04 共通部品「レイヤー」）。画面の中だけで持つ（保存はしない）。
// 筆界はロック固定（外せない）。既定は、すべて表示・筆界以外は非ロック。
import { create } from 'zustand'
import { FIXED_LOCKED, LAYER_NAMES, type LayerName } from '../plan/layers'

export interface LayersState {
  visible: Record<LayerName, boolean>
  locked: Record<LayerName, boolean>
  setVisible: (name: LayerName, on: boolean) => void
  /** 筆界は固定。ほかは切り替えられる */
  setLocked: (name: LayerName, on: boolean) => void
  reset: () => void
}

const initialVisible = Object.fromEntries(LAYER_NAMES.map((n) => [n, true])) as Record<LayerName, boolean>
const initialLocked = Object.fromEntries(LAYER_NAMES.map((n) => [n, FIXED_LOCKED.includes(n)])) as Record<LayerName, boolean>

export const useLayers = create<LayersState>((set) => ({
  visible: initialVisible,
  locked: initialLocked,
  setVisible: (name, on) => set((s) => ({ visible: { ...s.visible, [name]: on } })),
  setLocked: (name, on) =>
    set((s) => (FIXED_LOCKED.includes(name) ? s : { locked: { ...s.locked, [name]: on } })),
  reset: () => set({ visible: initialVisible, locked: initialLocked }),
}))
